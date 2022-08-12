import { ExecutionResult } from 'graphql'
import { createSchema, createYoga, Repeater, Plugin } from 'graphql-yoga'

describe('accept header', () => {
  it('instruct server to return an event-stream with GET parameters', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
      }),
    })

    const response = await yoga.fetch(`http://yoga/graphql?query=query{ping}`, {
      headers: {
        accept: 'text/event-stream',
      },
    })
    expect(response.headers.get('content-type')).toEqual('text/event-stream')
    const valueStr = await response.text()
    expect(valueStr).toContain(
      `data: ${JSON.stringify({ data: { ping: null } })}`,
    )
  })

  it('instruct server to return an event-stream with POST body', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
      }),
    })

    const response = await yoga.fetch(`http://yoga/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({ query: '{ping}' }),
    })
    expect(response.headers.get('content-type')).toEqual('text/event-stream')
    const valueStr = await response.text()
    expect(valueStr).toContain(
      `data: ${JSON.stringify({ data: { ping: null } })}`,
    )
  })

  it('instruct server to return a multipart result with GET parameters', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        resolvers: {
          Query: { ping: () => 'pong' },
        },
      }),
    })

    const response = await yoga.fetch(`http://yoga/graphql?query=query{ping}`, {
      headers: {
        accept: 'multipart/mixed',
      },
    })
    expect(response.headers.get('content-type')).toEqual(
      'multipart/mixed; boundary="-"',
    )
    const expectedStrs = [
      `Content-Type: application/json; charset=utf-8`,
      `Content-Length: 24`,
      `${JSON.stringify({ data: { ping: 'pong' } })}`,
    ]
    for await (const chunk of response.body!) {
      const valueStr = Buffer.from(chunk).toString('utf-8')
      if (expectedStrs.includes(valueStr)) {
        expectedStrs.splice(expectedStrs.indexOf(valueStr), 1)
      }
      if (expectedStrs.length === 0) {
        break
      }
    }
  })

  it('instruct server to return a multipart result with POST body', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        resolvers: {
          Query: { ping: () => 'pong' },
        },
      }),
    })

    const response = await yoga.fetch(`http://yoga/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'multipart/mixed',
      },
      body: JSON.stringify({ query: '{ping}' }),
    })
    expect(response.headers.get('content-type')).toEqual(
      'multipart/mixed; boundary="-"',
    )
    const expectedStrs = [
      `Content-Type: application/json; charset=utf-8`,
      `Content-Length: 24`,
      `${JSON.stringify({ data: { ping: 'pong' } })}`,
    ]
    for await (const chunk of response.body!) {
      const valueStr = Buffer.from(chunk).toString('utf-8')
      if (expectedStrs.includes(valueStr)) {
        expectedStrs.splice(expectedStrs.indexOf(valueStr), 1)
      }
      if (expectedStrs.length === 0) {
        break
      }
    }
    expect(expectedStrs.length).toEqual(0)
  })

  it('server rejects request for AsyncIterable source (subscription) when client only accepts application/json', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
          type Subscription {
            counter: Int
          }
        `,
        resolvers: {
          Subscription: {
            counter: {
              subscribe: () =>
                new Repeater((push, end) => {
                  push(1)
                  push(2)
                  end()
                }),
              resolve: (t) => t,
            },
          },
        },
      }),
    })

    const response = await yoga.fetch(
      `http://yoga/graphql?query=subscription{counter}`,
      {
        headers: {
          accept: 'application/json',
        },
      },
    )
    expect(response.status).toEqual(200)
    const body = await response.json()
    expect(body.errors).toEqual([
      { message: 'Subscriptions are not supported' },
    ])
  })

  it('server rejects request for AsyncIterable source (defer/stream) when client only accepts application/json', async () => {
    // here we are faking a defer/stream response via a plugin by replacing the executor
    const plugin: Plugin = {
      onExecute(args) {
        args.setExecuteFn(() =>
          Promise.resolve(
            new Repeater<ExecutionResult<any, any>>((_push, end) => {
              end()
            }) as any,
          ),
        )
      },
    }

    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
          type Subscription {
            counter: Int
          }
        `,
      }),
      plugins: [plugin],
    })

    const response = await yoga.fetch(`http://yoga/graphql?query=query{ping}`, {
      headers: {
        accept: 'application/json',
      },
    })
    expect(response.status).toEqual(200)
    const body = await response.json()
    expect(body.errors).toEqual([
      { message: 'Subscriptions are not supported' },
    ])
  })
})
