/** The `onError` request parameter (graphql/graphql-spec#1163). */
import { BREAK, GraphQLError, visit, type DocumentNode } from 'graphql';
import { isAsyncIterable } from '@envelop/core';
import type { ExecutionArgs } from '@graphql-tools/executor';
import { mapAsyncIterator } from '@whatwg-node/promise-helpers';
import type { ExecutionResultWithSerializer } from './plugins/types.js';

/**
 * What a client may send as `onError`. Wire vocabulary, so it includes values
 * this server cannot execute. Parse it with `resolveOnError` before use.
 */
export type OnErrorRequestValue = 'NULL' | 'PROPAGATE' | 'HALT';

/**
 * An `onError` behavior this server can actually carry out.
 *
 * `'NULL'` is deliberately absent: no execution engine Yoga can call
 * implements it (verified against `@graphql-tools/executor`'s
 * `ExecutionArgs`), and a PROPAGATE-mode result has already discarded the
 * sibling data NULL mode would need to preserve, so it can't be reconstructed
 * after the fact either.
 */
export type OnErrorBehavior = Exclude<OnErrorRequestValue, 'NULL'>;

type ExecutionOutput = ExecutionResultWithSerializer | AsyncIterable<ExecutionResultWithSerializer>;

const REQUEST_VALUES = new Set<string>([
  'NULL',
  'PROPAGATE',
  'HALT',
] satisfies OnErrorRequestValue[]);

/**
 * Parse the `onError` request parameter into the behavior to execute. Total:
 * an absent value resolves to the spec default `'PROPAGATE'`.
 *
 * @throws GraphQLError 400 with `http.spec: true` when the value is not one of
 * the three spec strings. The spec mandates a request error here.
 * @throws GraphQLError 400 with `code: 'ON_ERROR_UNSUPPORTED'` and no
 * `http.spec` when the value is `'NULL'`. The client did nothing wrong, so
 * claiming a spec violation would misreport it.
 */
export function resolveOnError(value: unknown): OnErrorBehavior {
  if (value == null) return 'PROPAGATE';
  if (typeof value !== 'string') throw invalidOnError(extendedTypeof(value));
  if (!REQUEST_VALUES.has(value)) throw invalidOnError(JSON.stringify(value));
  if (value === 'NULL') throw unsupportedOnError('NULL', NULL_REASON);
  return value as OnErrorBehavior;
}

/**
 * `'PROPAGATE'` is the engine's own behavior: identity. `'HALT'` collapses
 * each complete payload (see `haltPayload`), applied per event for a
 * subscription, which is exactly the spec's "cease the current event, leave
 * the subscription in place" — the same pure function serves both because a
 * subscription event and a singular result are the same shape.
 *
 * Incremental-delivery streams never reach here: `processRequest` refuses
 * `HALT` + `@defer`/`@stream` before execution, because graphql-tools'
 * `ExecutionResult` carries `data`/`errors` and the incremental fields
 * (`hasNext`, `pending`, …) all optional on one type, so a subscription event
 * and an in-flight `@defer`/`@stream` fragment are indistinguishable by shape
 * once they reach this function — the refusal has to happen earlier, keyed
 * on the document alone. It can't be keyed on Accept-header negotiation
 * instead: the executor runs `@defer`/`@stream` incrementally regardless of
 * whether the client negotiated a multipart wire format, so a document with
 * `@defer`/`@stream` always needs the refusal, negotiated or not.
 */
export function applyOnError(behavior: OnErrorBehavior, result: ExecutionOutput): ExecutionOutput {
  if (behavior === 'PROPAGATE') return result;
  return isAsyncIterable(result) ? mapAsyncIterator(result, haltPayload) : haltPayload(result);
}

/**
 * Collapse one complete payload under `HALT`. Idempotent — feeding
 * `{ data: null, errors: [e] }` back in returns it unchanged — which is what
 * lets this emulation stay in the pipeline once the engine gains native
 * `onError` support, rather than needing to be ripped out in the same commit.
 *
 * Spreads rather than building a fresh object, so `extensions.http` (status
 * and header overrides `getResponseInitByRespectingErrors` reads, error.ts)
 * and `stringify` (the serializer `jsonStringifyResultWithoutInternals`
 * honors, result-processor/stringify.ts) both survive.
 */
function haltPayload(result: ExecutionResultWithSerializer): ExecutionResultWithSerializer {
  // No `data` key at all means a request error, not an execution error —
  // onError governs the latter only. `error.ts` uses this same `'data' in
  // result` check to decide the HTTP status for the same reason.
  if (!('data' in result)) return result;
  if (!result.errors?.length) return result;
  return { ...result, data: null, errors: [result.errors[0]!] };
}

/**
 * Does not evaluate `if:`, so `@defer(if: false)` still counts — a client who wrote `@defer` and asked
 * for `HALT` gets a clear refusal rather than a behavior that silently
 * depends on a variable.
 */
export function usesIncrementalDirectives(document: DocumentNode): boolean {
  let found = false;
  visit(document, {
    Directive(node) {
      if (node.name.value === 'defer' || node.name.value === 'stream') {
        found = true;
        return BREAK;
      }
      return undefined;
    },
  });
  return found;
}

export function assertHaltAllowedForDocument(
  behavior: OnErrorBehavior,
  document: DocumentNode,
): void {
  if (behavior !== 'HALT') return;
  if (!usesIncrementalDirectives(document)) return;
  throw unsupportedOnError('HALT', INCREMENTAL_REASON);
}

/** 400, `http.spec: true`. The GraphQL spec mandates a request error for a bad value. */
function invalidOnError(given: string): GraphQLError {
  return new GraphQLError(
    `Expected "onError" param to be one of "NULL", "PROPAGATE", "HALT", but given ${given}.`,
    {
      extensions: {
        http: { spec: true, status: 400, headers: { Allow: 'GET, POST' } },
        code: 'BAD_REQUEST',
      },
    },
  );
}

/**
 * 400, no `http.spec`. The value is valid per spec; this server cannot execute
 * it. `code` is distinct from `BAD_REQUEST` so a client can degrade to the
 * default behavior without matching on the message.
 */
function unsupportedOnError(value: OnErrorRequestValue, reason: string): GraphQLError {
  return new GraphQLError(`The "onError" value "${value}" ${reason}`, {
    extensions: { http: { status: 400 }, code: 'ON_ERROR_UNSUPPORTED' },
  });
}

const NULL_REASON = 'is not supported by this execution engine.';
const INCREMENTAL_REASON = 'cannot be combined with incremental delivery (@defer/@stream).';

function extendedTypeof(
  val: unknown,
):
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function'
  | 'array'
  | 'null' {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

type AssertTrue<T extends true> = T;

/** Resolves to a compile error message once the engine grows `onError` support. */
type EngineLacksOnError<TArgs> = 'onError' extends keyof TArgs
  ? 'The execution engine now accepts `onError`. Forward params.onError on executionArgs in process-request.ts, retire the HALT emulation in useHaltOnError, and allow NULL in resolveOnError.'
  : true;

/**
 * Type-only tripwire, zero runtime cost. `pnpm check:types` fails the day
 * `@graphql-tools/executor` adds `onError` to `ExecutionArgs`, and the compiler
 * error text names the edits that retire this module's emulation.
 *
 * This is the forward-compatibility mechanism, in place of a runtime capability
 * sniff. A sniff cannot work here: Yoga calls `enveloped.execute`, which is
 * envelop's composed wrapper, so no property or identity of the underlying
 * executor survives to be inspected, and `useEngine` lets a user swap the
 * engine entirely.
 */
type _OnErrorTripwire = AssertTrue<EngineLacksOnError<ExecutionArgs>>;
