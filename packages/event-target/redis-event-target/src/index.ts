import type { Cluster, Redis } from 'ioredis';
import type { TypedEventTarget } from '@graphql-yoga/typed-event-target';
import { CustomEvent } from '@whatwg-node/events';

export type CreateRedisEventTargetArgs = {
  publishClient: Redis | Cluster;
  subscribeClient: Redis | Cluster;
  serializer?: {
    stringify: (message: unknown) => string;
    parse: (message: string) => unknown;
  };
};

export function createRedisEventTarget<TEvent extends CustomEvent>(
  args: CreateRedisEventTargetArgs,
): TypedEventTarget<TEvent> {
  const { publishClient, subscribeClient } = args;

  const serializer = args.serializer ?? JSON;

  const callbacksForTopic = new Map<string, Set<EventListener>>();

  function onMessage(channel: string, message: string) {
    const callbacks = callbacksForTopic.get(channel);
    if (callbacks === undefined) {
      return;
    }

    const event = new CustomEvent(channel, {
      detail: message === '' ? null : serializer.parse(message),
    }) as TEvent;
    for (const callback of callbacks) {
      callback(event);
    }
  }

  (subscribeClient as Redis).on('message', onMessage);

  function addCallback(topic: string, callback: EventListener) {
    let callbacks = callbacksForTopic.get(topic);
    if (callbacks === undefined) {
      callbacks = new Set();
      callbacksForTopic.set(topic, callbacks);

      subscribeClient.subscribe(topic);
    }
    callbacks.add(callback);
  }

  function removeCallback(topic: string, callback: EventListener) {
    const callbacks = callbacksForTopic.get(topic);
    if (callbacks === undefined) {
      return;
    }
    callbacks.delete(callback);
    if (callbacks.size > 0) {
      return;
    }
    callbacksForTopic.delete(topic);
    subscribeClient.unsubscribe(topic);
  }

  return {
    addEventListener(topic, callbackOrOptions: EventListenerOrEventListenerObject) {
      if (callbackOrOptions != null) {
        const callback =
          'handleEvent' in callbackOrOptions ? callbackOrOptions.handleEvent : callbackOrOptions;
        addCallback(topic, callback);
      }
    },
    dispatchEvent(event: TEvent) {
      publishClient.publish(
        event.type,
        event.detail === undefined ? '' : serializer.stringify(event.detail),
      );
      return true;
    },
    removeEventListener(topic, callbackOrOptions: EventListenerOrEventListenerObject) {
      if (callbackOrOptions != null) {
        const callback =
          'handleEvent' in callbackOrOptions ? callbackOrOptions.handleEvent : callbackOrOptions;
        removeCallback(topic, callback);
      }
    },
  };
}
