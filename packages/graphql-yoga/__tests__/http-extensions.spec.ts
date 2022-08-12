import { GraphQLError } from 'graphql'
import { createSchema, createYoga } from 'graphql-yoga'

describe('GraphQLError.extensions.http', () => {
  it('sets correct status code and headers for thrown GraphQLError in a resolver', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        resolvers: {
          Query: {
            a() {
              throw new GraphQLError('A', {
                extensions: {
                  http: {
                    status: 401,
                    headers: {
                      'www-authenticate': 'Bearer',
                    },
                  },
                },
              })
            },
          },
        },
      }),
      logging: false,
    })

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ a }' }),
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe('Bearer')
  })

  it('picks the highest status code and headers for GraphQLErrors thrown within multiple resolvers', async () => {
    const yoga = createYoga({
      schema: {
        typeDefs: /* GraphQL */ `
          type Query {
            a: String
            b: String
          }
        `,
        resolvers: {
          Query: {
            a: () => {
              throw new GraphQLError('A', {
                extensions: {
                  http: {
                    status: 401,
                  },
                },
              })
            },
            b: () => {
              throw new GraphQLError('B', {
                extensions: {
                  http: {
                    status: 503,
                  },
                },
              })
            },
          },
        },
      },
    })

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ a b }' }),
    })

    expect(response.status).toBe(503)

    const body = JSON.parse(await response.text())
    expect(body).toMatchObject({
      data: {
        a: null,
        b: null,
      },
      errors: [
        {
          message: 'A',
          path: ['a'],
        },
        {
          message: 'B',
          path: ['b'],
        },
      ],
    })
  })

  it('picks the header of the last GraphQLError when multiple errors are thrown within multiple resolvers', async () => {
    const yoga = createYoga({
      schema: {
        typeDefs: /* GraphQL */ `
          type Query {
            a: String
            b: String
          }
        `,
        resolvers: {
          Query: {
            a: () => {
              throw new GraphQLError('', {
                extensions: {
                  http: {
                    headers: {
                      'x-foo': 'A',
                    },
                  },
                },
              })
            },
            b: () => {
              throw new GraphQLError('DB is not available', {
                extensions: {
                  http: {
                    headers: {
                      'x-foo': 'B',
                    },
                  },
                },
              })
            },
          },
        },
      },
    })

    let response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ a b }' }),
    })

    expect(response.headers.get('x-foo')).toBe('B')

    response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ b a }' }),
    })

    expect(response.headers.get('x-foo')).toBe('A')
  })
})
