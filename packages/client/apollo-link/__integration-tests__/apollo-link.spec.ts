import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { parse, versionInfo } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { YogaLink } from '@graphql-yoga/apollo-link';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
describeIf(versionInfo.major >= 16)('Yoga Apollo Link', () => {
  const endpoint = '/graphql';
  const hostname = '127.0.0.1';
  const yoga = createYoga({
    graphqlEndpoint: endpoint,
    logging: false,
    maskedErrors: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        scalar File
        type Query {
          hello: String
        }
        type Mutation {
          readFile(file: File!): String!
        }
        type Subscription {
          time: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'Hello Apollo Client!',
        },
        Mutation: {
          readFile: (_, args: { file: File }) => args.file.text(),
        },
        Subscription: {
          time: {
            async *subscribe() {
              while (true) {
                await setTimeout$(1000);
                yield new Date().toISOString();
              }
            },
            resolve: str => str,
          },
        },
      },
    }),
  });

  let server: Server;
  let url: string;
  let client: ApolloClient;

  beforeAll(async () => {
    server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, hostname, resolve));
    const port = (server.address() as AddressInfo).port;
    url = `http://${hostname}:${port}${endpoint}`;
    client = new ApolloClient({
      link: new YogaLink({
        endpoint: url,
        fetch: yoga.fetch as WindowOrWorkerGlobalScope['fetch'],
      }),
      cache: new InMemoryCache(),
    });
  });
  afterAll(done => {
    server.close(() => done());
  });
  it('should handle queries correctly', async () => {
    const result = await client.query({
      query: parse(/* GraphQL */ `
        query Greetings {
          hello
        }
      `),
    });
    expect(result.error).toBeFalsy();
    expect(result.data).toEqual({
      hello: 'Hello Apollo Client!',
    });
  });
  it('should handle subscriptions correctly', async () => {
    expect.assertions(5);
    const observable = client.subscribe({
      query: parse(/* GraphQL */ `
        subscription Time {
          time
        }
      `),
    });
    const collectedValues: string[] = [];
    let i = 0;
    await new Promise<void>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = observable.subscribe((result: any) => {
        collectedValues.push(result.data?.['time']);
        i++;
        if (i > 2) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
    expect(collectedValues.length).toBe(3);
    expect(i).toBe(3);
    const now = new Date();
    for (const value of collectedValues) {
      expect(new Date(value).getFullYear()).toBe(now.getFullYear());
    }
  });
  it.skip('should handle file uploads correctly', async () => {
    const result = await client.mutate({
      mutation: parse(/* GraphQL */ `
        mutation readFile($file: File!) {
          readFile(file: $file)
        }
      `),
      variables: {
        file: new yoga.fetchAPI.File(['Hello World'], 'file.txt', {
          type: 'text/plain',
        }),
      },
    });
    expect(result.error).toBeFalsy();
    expect(result.data).toEqual({
      readFile: 'Hello World',
    });
  });
});
