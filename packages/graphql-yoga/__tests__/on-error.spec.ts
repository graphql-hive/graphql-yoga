import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { createSchema } from '../src/schema.js';
import { createYoga } from '../src/server.js';
import { eventStream } from './utilities.js';

describe('onError', () => {
  const mutateSomethingSpy = jest.fn(() => ({ fast: 'fast' }));
  const slowFieldSpy = jest.fn(() => 'slow');

  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        safe: String
        danger: String
      }
      type Subscription {
        ticks: Int
      }
      type Mutation {
        mutateSomething: Payload
      }
      type Payload {
        fast: String
        slow: String
      }
    `,
    resolvers: {
      Query: {
        safe: () => 'ok',
        danger: () => {
          throw new Error('danger failed');
        },
      },
      Subscription: {
        ticks: {
          async *subscribe() {
            yield { ticks: 1 };
            yield { ticks: 2 };
            yield { ticks: 3 };
          },
          resolve: (payload: { ticks: number }) => {
            if (payload.ticks === 2) throw new Error('tick 2 failed');
            return payload.ticks;
          },
        },
      },
      Mutation: {
        mutateSomething: () => mutateSomethingSpy(),
      },
      Payload: {
        slow: () => slowFieldSpy(),
      },
    },
  });

  beforeEach(() => {
    mutateSomethingSpy.mockClear();
    slowFieldSpy.mockClear();
  });

  function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    const yoga = createYoga({ schema, maskedErrors: false });
    return yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  it('HALT collapses an execution error to data: null with exactly one error', async () => {
    const response = await post({ query: '{ safe danger }', onError: 'HALT' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: null,
      errors: [expect.objectContaining({ message: 'danger failed' })],
    });
  });

  it('HALT on a successful query is byte-identical to no onError', async () => {
    const withHalt = await post({ query: '{ safe }', onError: 'HALT' });
    const withoutOnError = await post({ query: '{ safe }' });
    expect(await withHalt.text()).toBe(await withoutOnError.text());
  });

  it('PROPAGATE is byte-identical to no onError', async () => {
    const withPropagate = await post({ query: '{ safe danger }', onError: 'PROPAGATE' });
    const withoutOnError = await post({ query: '{ safe danger }' });
    expect(await withPropagate.text()).toBe(await withoutOnError.text());
  });

  it('NULL is rejected with 400 and ON_ERROR_UNSUPPORTED, since no engine Yoga calls implements it', async () => {
    const response = await post({ query: '{ safe }', onError: 'NULL' });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.errors).toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({ code: 'ON_ERROR_UNSUPPORTED' }),
      }),
    ]);
  });

  it('a typo value is rejected with 400 and BAD_REQUEST', async () => {
    // `accept: application/graphql-response+json` opts into the strict GraphQL-over-HTTP
    // status codes; plain `application/json` keeps 200 for spec-mandated request errors for
    // legacy client compatibility, which `invalidOnError`'s `http.spec: true` participates in.
    const response = await post(
      { query: '{ safe }', onError: 'halt' },
      { accept: 'application/graphql-response+json' },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toEqual([
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'BAD_REQUEST' }) }),
    ]);
  });

  it('matches POST JSON when sent as a GET query parameter', async () => {
    const yoga = createYoga({ schema, maskedErrors: false });
    const response = await yoga.fetch(
      'http://yoga/graphql?' +
        new URLSearchParams({ query: '{ safe danger }', onError: 'HALT' }).toString(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: null,
      errors: [expect.objectContaining({ message: 'danger failed' })],
    });
  });

  it('matches POST JSON when sent as a form-urlencoded parameter', async () => {
    const yoga = createYoga({ schema, maskedErrors: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query: '{ safe danger }', onError: 'HALT' }).toString(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: null,
      errors: [expect.objectContaining({ message: 'danger failed' })],
    });
  });

  it('applies independently per entry in a batched request', async () => {
    const yoga = createYoga({ schema, maskedErrors: false, batching: true });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { query: '{ safe danger }', onError: 'HALT' },
        { query: '{ safe danger }' },
      ]),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { data: null, errors: [expect.objectContaining({ message: 'danger failed' })] },
      {
        data: { safe: 'ok', danger: null },
        errors: [expect.objectContaining({ message: 'danger failed' })],
      },
    ]);
  });

  it('collapses only the erroring event of a subscription; the stream stays open', async () => {
    const yoga = createYoga({ schema, maskedErrors: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({ query: 'subscription { ticks }', onError: 'HALT' }),
    });
    expect(response.status).toBe(200);

    const events: unknown[] = [];
    for await (const event of eventStream(response.body!)) {
      events.push(event);
      if (events.length === 3) break;
    }

    expect(events).toEqual([
      { data: { ticks: 1 } },
      { data: null, errors: [expect.objectContaining({ message: 'tick 2 failed' })] },
      { data: { ticks: 3 } },
    ]);
  });

  it('refuses HALT combined with @defer before any resolver runs', async () => {
    const yoga = createYoga({ schema, maskedErrors: false, plugins: [useDeferStream()] });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'multipart/mixed' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            mutateSomething {
              fast
              ... @defer {
                slow
              }
            }
          }
        `,
        onError: 'HALT',
      }),
    });

    expect(response.status).toBe(400);
    // Negotiated as multipart, so assert on the serialized text, not response.json().
    const body = await response.text();
    expect(body).toContain('"code":"ON_ERROR_UNSUPPORTED"');
    expect(body).toContain('cannot be combined with incremental delivery');
    expect(mutateSomethingSpy).not.toHaveBeenCalled();
    expect(slowFieldSpy).not.toHaveBeenCalled();
  });

  // Regression guard: the executor runs @defer/@stream incrementally regardless of whether the
  // client negotiated the multipart wire format via Accept, so the refusal must not depend on
  // that negotiation either — otherwise a client that omits (or doesn't match) the multipart
  // Accept header gets a 200 with the deferred error silently un-collapsed instead of a refusal.
  it('refuses HALT combined with @defer even when multipart/mixed is not negotiated', async () => {
    const yoga = createYoga({ schema, maskedErrors: false, plugins: [useDeferStream()] });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            mutateSomething {
              fast
              ... @defer {
                slow
              }
            }
          }
        `,
        onError: 'HALT',
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({ code: 'ON_ERROR_UNSUPPORTED' }),
      }),
    ]);
    expect(mutateSomethingSpy).not.toHaveBeenCalled();
    expect(slowFieldSpy).not.toHaveBeenCalled();
  });

  // Regression guard: Yoga's own bundled GraphiQL sends
  // `accept: application/graphql-response+json, application/json, multipart/mixed` on every
  // query and mutation, which negotiates incremental delivery off the header alone. Refusing
  // HALT on that negotiation (rather than on whether the document actually uses @defer/@stream)
  // would 400 every HALT request made from Yoga's own UI, including this one, which has no
  // incremental directive anywhere in the document.
  it('allows HALT when multipart/mixed is accepted but the document has no @defer/@stream', async () => {
    const response = await post(
      { query: '{ safe danger }', onError: 'HALT' },
      { accept: 'application/graphql-response+json, application/json, multipart/mixed' },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: null,
      errors: [expect.objectContaining({ message: 'danger failed' })],
    });
  });
});
