import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { AppModule } from './fixtures/graphql/app.module';

let app: INestApplication, url: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        conditionalSchema: async () => {
          const DogObjectType = new GraphQLObjectType({
            name: 'Dog',
            fields: {
              id: {
                type: new GraphQLNonNull(GraphQLID),
              },
              name: {
                type: new GraphQLNonNull(GraphQLString),
              },
              breed: {
                type: new GraphQLNonNull(GraphQLString),
              },
            },
          });

          return new GraphQLSchema({
            query: new GraphQLObjectType({
              name: 'Query',
              fields: {
                getDogs: {
                  type: new GraphQLList(new GraphQLNonNull(DogObjectType)),
                  resolve: () => [
                    {
                      id: '1',
                      name: 'Bingo',
                      breed: 'Dalmatian',
                    },
                  ],
                },
              },
            }),
          });
        },
      }),
    ],
  }).compile();
  app = module.createNestApplication();
  await app.listen(0);
  url = (await app.getUrl()) + '/graphql';
});

afterAll(() => app.close());

it('should return query result', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        {
          getDogs {
            id
            name
            breed
          }
        }
      `,
    }),
  });
  await expect(res.json()).resolves.toMatchInlineSnapshot(`
    {
      "data": {
        "getDogs": [
          {
            "breed": "Dalmatian",
            "id": "1",
            "name": "Bingo",
          },
        ],
      },
    }
  `);
});

it('should return query result for conditional schema', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        {
          getDogs {
            id
            name
            breed
          }
        }
      `,
    }),
  });
  await expect(res.json()).resolves.toMatchInlineSnapshot(`
    {
      "data": {
        "getDogs": [
          {
            "breed": "Dalmatian",
            "id": "1",
            "name": "Bingo",
          },
        ],
      },
    }
  `);
});
