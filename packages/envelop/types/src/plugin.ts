import {
  OnContextBuildingHook,
  OnEnvelopedHook,
  OnExecuteHook,
  OnParseHook,
  OnPluginInitHook,
  OnSchemaChangeHook,
  OnSubscribeHook,
  OnValidateHook,
} from './hooks.js';
import type { PromiseOrValue } from './utils.js';

export interface Plugin<PluginContext extends Record<string, any> = {}> {
  /**
   * Instrumentation wrapping each phases, including hooks executions.
   */
  instrumentation?: Instrumentation<PluginContext>;
  /**
   * Invoked for each call to getEnveloped.
   */
  onEnveloped?: OnEnvelopedHook<PluginContext>;
  /**
   * Invoked each time the GraphQL schema has been replaced from within a plugin.
   */
  onSchemaChange?: OnSchemaChangeHook;
  /**
   * Invoked when a plugin is initialized.
   */
  onPluginInit?: OnPluginInitHook<PluginContext>;
  /**
   * Invoked for each execute call.
   */
  onExecute?: OnExecuteHook<PluginContext>;
  /**
   * Invoked for each subscribe call.
   */
  onSubscribe?: OnSubscribeHook<PluginContext>;
  /**
   * Invoked for each parse call.
   */
  onParse?: OnParseHook<PluginContext>;
  /**
   * Invoked for each validate call.
   */
  onValidate?: OnValidateHook<PluginContext>;
  /**
   * Invoked for each time the context is builded.
   */
  onContextBuilding?: OnContextBuildingHook<PluginContext>;
}

export type Instrumentation<TContext extends Record<string, any>> = {
  /**
   * Wraps the initialization phase (`envelop` function call and `onEnvelop` hooks)
   */
  init?: (payload: { context: TContext }, wrapped: () => void) => void;
  /**
   * Wraps the parse phase (`parse` function call and `onParse` hooks)
   */
  parse?: (payload: { context: TContext }, wrapped: () => void) => void;
  /**
   * Wraps the validate phase (`validate` function call and `onValidate` hooks)
   */
  validate?: (payload: { context: TContext }, wrapped: () => void) => void;
  /**
   * Wraps the context building phase (`buildContext` function call)
   */
  context?: (payload: { context: TContext }, wrapped: () => void) => void;
  /**
   * Wraps the execute phase (`execute` function call and `onExecute` hooks)
   */
  execute?: (
    payload: { context: TContext },
    wrapped: () => PromiseOrValue<void>,
  ) => PromiseOrValue<void>;
  /**
   * Wraps the subscribe phase (`subscribe` function call and `onSubsrcibe` hooks)
   */
  subscribe?: (
    payload: { context: TContext },
    wrapped: () => PromiseOrValue<void>,
  ) => PromiseOrValue<void>;
};
