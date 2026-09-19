import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { AppModule } from './fixtures/graphql/app.module';
import { useTestApp } from './utils/app';

const { getUrl } = useTestApp(() =>
  Test.createTestingModule({
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
  }).compile(),
);

it('should return query result', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        {
          getCats {
            id
            color
            weight
          }
        }
      `,
    }),
  });
  await expect(res.json()).resolves.toMatchInlineSnapshot(`
    {
      "data": {
        "getCats": [
          {
            "color": "black",
            "id": 1,
            "weight": 5,
          },
        ],
      },
    }
  `);
});

it('should return query result for conditional schema', async () => {
  const res = await fetch(getUrl(), {
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
