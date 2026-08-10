import { version as graphqlVersion, specifiedScalarTypes } from 'graphql';
import { resolvers as scalarsResolvers, typeDefs as scalarsTypeDefs } from 'graphql-scalars';
import { createSchema, createYoga } from '../src/index.js';

// graphql-scalars@1.25.0 (latest) only declares peer support up to graphql@16, so its custom
// scalars can't be relied on to reject invalid input under graphql-js 17 until it publishes support.
// https://github.com/graphql-hive/graphql-scalars (peerDependencies.graphql caps at ^16.0.0)
const isGraphQL17OrAbove = parseInt(graphqlVersion.split('.')[0]!, 10) >= 17;
const graphqlScalarsNames = new Set(Object.values(scalarsResolvers).map(scalar => scalar.name));

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
    const itSkipUnsupported =
      isGraphQL17OrAbove && graphqlScalarsNames.has(typeName) ? it.skip : it;
    itSkipUnsupported(
      `should respond with 400 if ${typeName} scalar parsing fails from "variables"`,
      async () => {
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
      },
    );
    itSkipUnsupported(
      `should respond with 400 if ${typeName} scalar parsing fails from "SDL"`,
      async () => {
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
      },
    );
  }
});
