import { specifiedScalarTypes } from 'graphql';
import { resolvers as scalarsResolvers, typeDefs as scalarsTypeDefs } from 'graphql-scalars';
import { createSchema, createYoga } from '../src/index.js';

describe('graphql-scalars', () => {
  const ignoredScalars = [
    'Void',
    'NonEmptyString',
    'JSON',
    'String',
    'USCurrency',
    'ID',
    'Locale',
    'Currency',
    'Timestamp',
  ];
  const allScalars = [...specifiedScalarTypes, ...Object.values(scalarsResolvers)].filter(
    type => !ignoredScalars.includes(type.name),
  );
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: [
        scalarsTypeDefs,
        /* GraphQL */ `
        type Query {
          ${allScalars
            .map(scalar => `get${scalar.name}(input: ${scalar.name}!): ${scalar.name}!`)
            .join('\n')}
        }
      `,
      ],
      resolvers: [
        scalarsResolvers,
        ...allScalars.map(scalar => ({
          Query: {
            [`get${scalar.name}`]: (_: never, { input }: { input: unknown }) => input,
          },
        })),
      ],
    }),
    logging: false,
  });
  for (const { name: typeName } of allScalars) {
    it(`should respond with 400 if ${typeName} scalar parsing fails from "variables"`, async () => {
      const res = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          accept: 'application/graphql-response+json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
          query Get${typeName}($input: ${typeName}!) {
            get${typeName}(input: $input)
          }
        `,
          variables: {
            input: 'NaD',
          },
        }),
      });
      expect(res.status).toBe(400);
    });
    it(`should respond with 400 if ${typeName} scalar parsing fails from "SDL"`, async () => {
      const res = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          accept: 'application/graphql-response+json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
          query Get${typeName} {
            get${typeName}(input: "NaD")
          }
        `,
        }),
      });

      expect(res.status).toBe(400);
    });
  }
});
