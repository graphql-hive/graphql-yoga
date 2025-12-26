import { GetEnvelopedFn } from './get-enveloped.js';
import { Plugin } from './plugin.js';
import { Spread, TuplifyUnion, Unarray } from './utils.js';

// We are using `interface` instead of `type` in order to allow type augmentation
export interface DefaultContext extends Record<string | symbol | number, unknown> {}

export type ComposeContextArray<V> = V extends []
  ? []
  : V extends [Plugin<infer Ctx>]
    ? [Ctx]
    : V extends [Plugin<infer Ctx>, ...infer R]
      ? [Ctx, ...ComposeContextArray<R>]
      : [{ error: 'ComposeContextArray-no-match'; value: V }];

export type ComposeContext<V extends Plugin[]> = Spread<
  ComposeContextArray<TuplifyUnion<Unarray<V>>>
>;
export type ContextFrom<TEnvelop> =
  TEnvelop extends GetEnvelopedFn<infer Context> ? Context : never;
