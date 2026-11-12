import { GraphQLError, parse } from 'graphql';
import {
  applyOnError,
  assertHaltAllowedForDocument,
  resolveOnError,
  usesIncrementalDirectives,
} from './on-error.js';
import type { ExecutionResultWithSerializer } from './plugins/types.js';

/** Runs `fn`, asserts it throws a `GraphQLError`, and returns it for further assertions. */
function getThrownGraphQLError(fn: () => unknown): GraphQLError {
  try {
    fn();
  } catch (err) {
    if (err instanceof GraphQLError) return err;
    throw err;
  }
  throw new Error('expected fn to throw a GraphQLError');
}

describe('resolveOnError', () => {
  it('defaults an absent value to PROPAGATE', () => {
    expect(resolveOnError(undefined)).toBe('PROPAGATE');
    expect(resolveOnError(null)).toBe('PROPAGATE');
  });

  it('accepts PROPAGATE and HALT', () => {
    expect(resolveOnError('PROPAGATE')).toBe('PROPAGATE');
    expect(resolveOnError('HALT')).toBe('HALT');
  });

  it('rejects a non-string value with a BAD_REQUEST spec error', () => {
    const err = getThrownGraphQLError(() => resolveOnError(42));
    expect(err.message).toMatch(/Expected "onError" param to be one of/);
    expect(err.extensions['code']).toBe('BAD_REQUEST');
    expect(err.extensions.http).toMatchObject({ spec: true, status: 400 });
  });

  it('rejects a near-miss string with a BAD_REQUEST spec error', () => {
    const err = getThrownGraphQLError(() => resolveOnError('halt'));
    expect(err.message).toBe(
      'Expected "onError" param to be one of "NULL", "PROPAGATE", "HALT", but given "halt".',
    );
    expect(err.extensions['code']).toBe('BAD_REQUEST');
    expect(err.extensions.http).toMatchObject({ spec: true });
  });

  it('rejects NULL with an ON_ERROR_UNSUPPORTED error that carries no http.spec', () => {
    const err = getThrownGraphQLError(() => resolveOnError('NULL'));
    expect(err.extensions['code']).toBe('ON_ERROR_UNSUPPORTED');
    expect(err.extensions.http?.spec).toBeUndefined();
    expect(err.extensions.http).toMatchObject({ status: 400 });
  });
});

describe('applyOnError', () => {
  function erroringResult(): ExecutionResultWithSerializer {
    return {
      data: null,
      errors: [new GraphQLError('resolver boom'), new GraphQLError('sibling boom')],
      extensions: { http: { status: 418 } },
      stringify: () => 'custom-serialized',
    };
  }

  it('PROPAGATE is the identity function', () => {
    const result = erroringResult();
    expect(applyOnError('PROPAGATE', result)).toBe(result);
  });

  it('HALT collapses data to null and keeps only the first error', () => {
    const result = erroringResult();
    const halted = applyOnError('HALT', result) as ExecutionResultWithSerializer;
    expect(halted.data).toBeNull();
    expect(halted.errors).toHaveLength(1);
    expect(halted.errors![0]).toBe(result.errors![0]);
  });

  it('HALT preserves extensions.http and the stringify serializer', () => {
    const result = erroringResult();
    const halted = applyOnError('HALT', result) as ExecutionResultWithSerializer;
    expect(halted.extensions).toEqual(result.extensions);
    expect(halted.stringify).toBe(result.stringify);
  });

  it('HALT is idempotent: applying it to an already-halted payload changes nothing further', () => {
    const result = erroringResult();
    const once = applyOnError('HALT', result) as ExecutionResultWithSerializer;
    const twice = applyOnError('HALT', once) as ExecutionResultWithSerializer;
    expect(twice).toEqual(once);
  });

  it('HALT leaves a successful result untouched', () => {
    const result: ExecutionResultWithSerializer = { data: { hello: 'world' } };
    expect(applyOnError('HALT', result)).toEqual(result);
  });

  it('HALT leaves a request error (no `data` key) untouched, by identity', () => {
    const result: ExecutionResultWithSerializer = {
      errors: [new GraphQLError('bad request')],
    };
    expect(applyOnError('HALT', result)).toBe(result);
  });

  it('HALT applies per event on a subscription stream, independently', async () => {
    const stream = (async function* () {
      yield { data: { n: 1 } } as ExecutionResultWithSerializer;
      yield {
        data: null,
        errors: [new GraphQLError('n2 failed')],
      } as ExecutionResultWithSerializer;
      yield { data: { n: 3 } } as ExecutionResultWithSerializer;
    })();

    const halted = applyOnError('HALT', stream) as AsyncIterable<ExecutionResultWithSerializer>;
    const events: ExecutionResultWithSerializer[] = [];
    for await (const event of halted) {
      events.push(event);
    }

    expect(events).toEqual([
      { data: { n: 1 } },
      { data: null, errors: [expect.objectContaining({ message: 'n2 failed' })] },
      { data: { n: 3 } },
    ]);
  });
});

describe('usesIncrementalDirectives', () => {
  it('is true for @defer', () => {
    expect(usesIncrementalDirectives(parse('{ a ... @defer { b } }'))).toBe(true);
  });

  it('is true for @stream', () => {
    expect(usesIncrementalDirectives(parse('{ a(list: []) @stream }'))).toBe(true);
  });

  it('is true for @defer(if: false), since the predicate does not evaluate `if`', () => {
    expect(usesIncrementalDirectives(parse('{ a ... @defer(if: false) { b } }'))).toBe(true);
  });

  it('is true for a directive used inside an unrelated fragment definition', () => {
    expect(
      usesIncrementalDirectives(
        parse('{ a ...Frag } fragment Frag on Query { b ... @defer { c } }'),
      ),
    ).toBe(true);
  });

  it('is false with no incremental directives anywhere in the document', () => {
    expect(usesIncrementalDirectives(parse('{ a b }'))).toBe(false);
  });
});

describe('assertHaltAllowedForDocument', () => {
  it('does not throw for PROPAGATE, regardless of the document', () => {
    expect(() =>
      assertHaltAllowedForDocument('PROPAGATE', parse('{ a ... @defer { b } }')),
    ).not.toThrow();
  });

  it('does not throw for HALT when the document has no @defer/@stream', () => {
    expect(() => assertHaltAllowedForDocument('HALT', parse('{ a b }'))).not.toThrow();
  });

  it('throws ON_ERROR_UNSUPPORTED for HALT when the document uses @defer, even without Accept-header negotiation', () => {
    const err = getThrownGraphQLError(() =>
      assertHaltAllowedForDocument('HALT', parse('{ a ... @defer { b } }')),
    );
    expect(err.extensions['code']).toBe('ON_ERROR_UNSUPPORTED');
    expect(err.extensions.http?.spec).toBeUndefined();
  });
});
