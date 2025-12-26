import { buildSchema, GraphQLError, parse } from 'graphql';
import { envelop, useSchema } from '@envelop/core';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useExtendedValidation } from '../src/index.js';

describe('useExtendedValidation', () => {
  it('supports usage of multiple useExtendedValidation in different plugins', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const testInstance = createTestkit(
      [
        useExtendedValidation({
          rules: [
            ctx => {
              return {
                OperationDefinition() {
                  ctx.reportError(new GraphQLError('No 1'));
                },
              };
            },
          ],
        }),
        useExtendedValidation({
          rules: [
            ctx => {
              return {
                OperationDefinition() {
                  ctx.reportError(new GraphQLError('No 2'));
                },
              };
            },
          ],
        }),
      ],
      schema,
    );

    const result = await testInstance.execute(operation);
    expect(result).toMatchInlineSnapshot(`
          {
            "data": null,
            "errors": [
              [GraphQLError: No 1],
              [GraphQLError: No 2],
            ],
          }
        `);
  });
  it('run extended validation phase exactly once if no validation error occurs', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    let extendedValidationRunCount = 0;
    const testInstance = createTestkit(
      [
        useExtendedValidation({
          rules: [
            () => {
              return {
                OperationDefinition() {
                  extendedValidationRunCount = extendedValidationRunCount + 1;
                },
              };
            },
          ],
        }),
        useExtendedValidation({
          rules: [
            () => {
              return {
                OperationDefinition() {},
              };
            },
          ],
        }),
      ],
      schema,
    );

    await testInstance.execute(operation);
    expect(extendedValidationRunCount).toEqual(1);
  });
  it('execute throws an error if "contextFactory" has not been invoked', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const { execute } = envelop({
      plugins: [
        useSchema(schema),
        useExtendedValidation({
          rules: [() => ({})],
        }),
      ],
    })();
    await expect(
      Promise.resolve().then(() =>
        execute({
          document: parse(operation),
          contextValue: {},
          schema,
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Plugin has not been properly set up. The 'contextFactory' function is not invoked and the result has not been passed to 'execute'."`,
    );
  });
  it('subscribe does run the extended validation phase', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
        }
        type Subscription {
          foo: String!
        }
      `,
      resolvers: {
        Subscription: {
          foo: {
            subscribe: async function* () {
              return;
            },
          },
        },
      },
    });
    const operation = /* GraphQL */ `
      subscription {
        foo
      }
    `;
    let calledExtendedValidationRule = false;
    const testkit = createTestkit(
      [
        useExtendedValidation({
          rules: [
            () => {
              calledExtendedValidationRule = true;
              return {};
            },
          ],
        }),
      ],
      schema,
    );
    await testkit.execute(operation);
    expect(calledExtendedValidationRule).toEqual(true);
  });
  it('subscribe does result in extended validation phase errors', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
        }
        type Subscription {
          foo: String!
        }
      `,
      resolvers: {
        Subscription: {
          foo: {
            subscribe: async function* () {
              return;
            },
          },
        },
      },
    });
    const operation = /* GraphQL */ `
      subscription {
        foo
      }
    `;
    const testkit = createTestkit(
      [
        useExtendedValidation({
          rules: [
            context => {
              context.reportError(new GraphQLError('Not today.'));
              return {};
            },
          ],
        }),
      ],
      schema,
    );
    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      {
        "data": null,
        "errors": [
          [GraphQLError: Not today.],
        ],
      }
    `);
  });
});
