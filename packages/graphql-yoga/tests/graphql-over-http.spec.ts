import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('GraphQL over HTTP', () => {
  // https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md#applicationgraphql-responsejson
  describe('content-type="application/graphql-response+json"', () => {
    describe('if the GraphQL response contains the {data} entry and it is not {null}, then the server MUST reply with a 2xx status code and SHOULD reply with 200 status code', () => {
      it('uses status code 200 if an unexpected error on nullable field occurs', async () => {
        const yoga = createYoga({
          schema: createSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                hi: String
                foo: String
              }
            `,
            resolvers: {
              Query: {
                hi: () => {
                  throw new Error('Database password bubatzbieber69 is incorrect.');
                },
                foo: () => 'hi',
              },
            },
          }),
          logging: false,
        });

        const result = await yoga.fetch('http://yoga/graphql', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/graphql-response+json',
          },
          body: JSON.stringify({ query: '{ hi foo }' }),
        });

        const text = await result.text();
        expect(text).toMatchInlineSnapshot(
          `"{"errors":[{"message":"Unexpected error.","locations":[{"line":1,"column":3}],"path":["hi"],"extensions":{"code":"INTERNAL_SERVER_ERROR"}}],"data":{"hi":null,"foo":"hi"}}"`,
        );

        expect(result.headers.get('content-type')).toEqual(
          'application/graphql-response+json; charset=utf-8',
        );
        expect(result.status).toEqual(200);
      });
    });
    describe('If the GraphQL response contains the {data} entry and it is {null}, then the server SHOULD reply with a 2xx status code and it is RECOMMENDED it replies with 200 status code.', () => {
      it('Uses status code 200 if data is null due to an error', async () => {
        const yoga = createYoga({
          schema: createSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                hi: String!
              }
            `,
            resolvers: {
              Query: {
                hi: () => {
                  throw new Error('Database password bubatzbieber69 is incorrect.');
                },
              },
            },
          }),
          logging: false,
        });

        const result = await yoga.fetch('http://yoga/graphql', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/graphql-response+json',
          },
          body: JSON.stringify({ query: '{ hi }' }),
        });

        const text = await result.text();
        expect(text).toMatchInlineSnapshot(
          `"{"errors":[{"message":"Unexpected error.","locations":[{"line":1,"column":3}],"path":["hi"],"extensions":{"code":"INTERNAL_SERVER_ERROR"}}],"data":null}"`,
        );

        expect(result.headers.get('content-type')).toEqual(
          'application/graphql-response+json; charset=utf-8',
        );
        expect(result.status).toEqual(200);
      });
    });
  });
});
