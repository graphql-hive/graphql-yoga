import { GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { createPushPullAsyncIterable } from './push-pull-async-iterable.js';

function multipartStream<TType = unknown>(source: ReadableStream<Uint8Array>) {
  return new Repeater<TType>(async (push, end) => {
    const cancel: Promise<{ done: true }> = end.then(() => ({ done: true }));
    const iterable = source[Symbol.asyncIterator]();

    while (true) {
      const result = await Promise.race([cancel, iterable.next()]);
      if (result.done) {
        break;
      }
      const value = result.value.toString();
      if (value.startsWith('{"')) {
        push(JSON.parse(value));
      }
    }

    iterable.return?.();
    end();
  });
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'hello',
      },
      goodbye: {
        type: GraphQLString,
        resolve: () => new Promise(resolve => process.nextTick(() => resolve('goodbye'))),
      },
      stream: {
        type: new GraphQLList(GraphQLString),
        async *resolve() {
          yield 'A';
          await new Promise(resolve => process.nextTick(resolve));
          yield 'B';
          await new Promise(resolve => process.nextTick(resolve));
          yield 'C';
        },
      },
    },
  }),
});

describe('Defer/Stream', () => {
  it('should error on defer directive usage when plugin is not used', async () => {
    const yoga = createYoga({
      schema,
    });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ ... @defer { goodbye } }' }),
    });

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toMatchInlineSnapshot(`"Unknown directive "@defer"."`);
  });

  it('should error on stream directive usage when plugin is not used', async () => {
    const yoga = createYoga({
      schema,
    });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ stream @stream }' }),
    });

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toMatchInlineSnapshot(`"Unknown directive "@stream"."`);
  });

  it('should execute on defer directive', async () => {
    const yoga = createYoga({
      schema,
      plugins: [useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ ... @defer { goodbye } }' }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/mixed; boundary="-"');

    const finalText = await response.text();

    expect(finalText).toMatchInlineSnapshot(`
"
---
Content-Type: application/json; charset=utf-8
Content-Length: 26

{"data":{},"hasNext":true}
---
Content-Type: application/json; charset=utf-8
Content-Length: 74

{"incremental":[{"data":{"goodbye":"goodbye"},"path":[]}],"hasNext":false}
-----
"
`);
  });

  it('should execute on stream directive', async () => {
    const yoga = createYoga({
      schema,
      plugins: [useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ stream @stream(initialCount: 2) }' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/mixed; boundary="-"');

    const finalText = await response.text();

    expect(finalText).toMatchInlineSnapshot(`
"
---
Content-Type: application/json; charset=utf-8
Content-Length: 44

{"data":{"stream":["A","B"]},"hasNext":true}
---
Content-Type: application/json; charset=utf-8
Content-Length: 68

{"incremental":[{"items":["C"],"path":["stream",2]}],"hasNext":true}
---
Content-Type: application/json; charset=utf-8
Content-Length: 17

{"hasNext":false}
-----
"
`);
  });

  it('correctly deals with the source upon aborted requests', async () => {
    const { source, push, terminate } = createPushPullAsyncIterable<string>();
    push('A');

    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hi: [String]
          }
        `,
        resolvers: {
          Query: {
            hi: () => source,
          },
        },
      }),
      plugins: [useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'multipart/mixed',
      },
      body: JSON.stringify({ query: '{ hi @stream }' }),
    });

    if (!response.body) {
      throw new Error('Missing body.');
    }

    let counter = 0;
    const toStr = (arr: Uint8Array) => Buffer.from(arr).toString('utf-8');

    for await (const chunk of response.body!) {
      const parts = toStr(chunk)
        .split('\r\n')
        .filter(p => p.startsWith('{'));
      for (const part of parts) {
        if (counter === 0) {
          expect(part).toBe(`{"data":{"hi":[]},"hasNext":true}`);
        } else if (counter === 1) {
          expect(part).toBe(`{"incremental":[{"items":["A"],"path":["hi",0]}],"hasNext":true}`);
          push('B');
        } else if (counter === 2) {
          expect(part).toBe(`{"incremental":[{"items":["B"],"path":["hi",1]}],"hasNext":true}`);
          push('C');
        } else if (counter === 3) {
          expect(part).toBe(`{"incremental":[{"items":["C"],"path":["hi",2]}],"hasNext":true}`);
          // when the source is returned this stream/loop should be exited.
          terminate();
          push('D');
        } else if (counter === 4) {
          expect(part).toBe(`{"hasNext":false}`);
        } else {
          throw new Error("LOL, this shouldn't happen.");
        }

        counter++;
      }
    }
  });

  it('multipart/mixed parser', async () => {
    const yoga = createYoga({
      schema,
      plugins: [useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ stream @stream }' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/mixed; boundary="-"');

    const source = multipartStream(response.body!);
    let counter = 0;

    for await (const value of source) {
      if (counter === 0) {
        expect(value).toEqual({
          data: {
            stream: [],
          },
          hasNext: true,
        });
        counter++;
      } else if (counter === 1) {
        expect(value).toEqual({
          hasNext: true,
          incremental: [
            {
              items: ['A'],
              path: ['stream', 0],
            },
          ],
        });
        counter++;
      } else if (counter === 2) {
        expect(value).toEqual({
          hasNext: true,
          incremental: [
            {
              items: ['B'],
              path: ['stream', 1],
            },
          ],
        });
        counter++;
      } else if (counter === 3) {
        expect(value).toEqual({
          hasNext: true,
          incremental: [
            {
              items: ['C'],
              path: ['stream', 2],
            },
          ],
        });
        counter++;
      } else if (counter === 4) {
        expect(value).toEqual({
          hasNext: false,
        });
        counter++;
      }
    }
  });

  describe('Accept header', () => {
    it('accept: <void>', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }
          `,
          resolvers: {
            Query: {
              hi: () =>
                new Repeater(async (push, stop) => {
                  await push('A');
                  stop();
                }),
            },
          },
        }),
        plugins: [useDeferStream()],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: '{ hi @stream }' }),
      });
      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('multipart/mixed; boundary="-"');
    });

    it('accept: application/json', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }
          `,
          resolvers: {
            Query: {
              hi: () =>
                new Repeater(async (push, stop) => {
                  await push('A');
                  stop();
                }),
            },
          },
        }),
        plugins: [useDeferStream()],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ query: '{ hi @stream }' }),
      });
      expect(response.status).toEqual(406);
      expect(response.headers.get('content-type')).toEqual(null);
      expect(await response.text()).toEqual('');
    });

    it('accept: multipart/mixed', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }
          `,
          resolvers: {
            Query: {
              hi: () =>
                new Repeater(async (push, stop) => {
                  await push('A');
                  stop();
                }),
            },
          },
        }),
        plugins: [useDeferStream()],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'multipart/mixed',
        },
        body: JSON.stringify({ query: '{ hi @stream }' }),
      });
      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('multipart/mixed; boundary="-"');
    });

    it('accept: */*', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }
          `,
          resolvers: {
            Query: {
              hi: () =>
                new Repeater(async (push, stop) => {
                  await push('A');
                  stop();
                }),
            },
          },
        }),
        plugins: [useDeferStream()],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
        },
        body: JSON.stringify({ query: '{ hi @stream }' }),
      });
      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('multipart/mixed; boundary="-"');
    });

    it('accept: application/graphql-response+json, application/json, text/event-stream, multipart/mixed', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }
          `,
          resolvers: {
            Query: {
              hi: () =>
                new Repeater(async (push, stop) => {
                  await push('A');
                  stop();
                }),
            },
          },
        }),
        plugins: [useDeferStream()],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept:
            'application/graphql-response+json, application/json, text/event-stream, multipart/mixed',
        },
        body: JSON.stringify({ query: '{ hi @stream }' }),
      });
      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('multipart/mixed; boundary="-"');
    });
  });

  describe('@graphql-tools/buildHTTPExecutor', () => {
    it('execute stream operation', async () => {
      const yoga = createYoga({ schema, plugins: [useDeferStream()] });
      const executor = buildHTTPExecutor({
        endpoint: 'http://yoga/graphql',
        fetch: yoga.fetch,
      });

      const result = await executor({
        // @ts-ignore
        document: parse(/* GraphQL */ `
          query {
            stream @stream(initialCount: 2)
          }
        `),
      });

      if (Symbol.asyncIterator in result) {
        let counter = 0;
        for await (const item of result) {
          if (counter === 0) {
            expect(item).toEqual({
              data: { stream: ['A', 'B'] },
            });
            counter++;
          } else if (counter >= 1) {
            expect(item).toEqual({
              data: { stream: ['A', 'B', 'C'] },
            });
            counter++;
          } else {
            throw new Error('LOL, this should not happen.');
          }
        }
      } else {
        throw new Error('Expected AsyncIterator');
      }
    });
    it('execute defer operation', async () => {
      const yoga = createYoga({ schema, plugins: [useDeferStream()] });
      const executor = buildHTTPExecutor({
        endpoint: 'http://yoga/graphql',
        fetch: yoga.fetch,
      });

      const result = await executor({
        // @ts-ignore
        document: parse(/* GraphQL */ `
          query {
            hello
            ... on Query @defer {
              goodbye
            }
          }
        `),
      });

      if (Symbol.asyncIterator in result) {
        let counter = 0;
        for await (const item of result) {
          if (counter === 0) {
            expect(item).toMatchInlineSnapshot(`
              {
                "data": {
                  "hello": "hello",
                },
              }
            `);
            counter++;
          } else if (counter === 1) {
            expect(item).toMatchInlineSnapshot(`
              {
                "data": {
                  "goodbye": "goodbye",
                  "hello": "hello",
                },
              }
            `);
            counter++;
          } else {
            throw new Error('LOL, this should not happen.');
          }
        }
      } else {
        throw new Error('Expected AsyncIterator');
      }
    });
  });
});
