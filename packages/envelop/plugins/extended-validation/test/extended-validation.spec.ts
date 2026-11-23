import { buildSchema, execute, GraphQLError, parse } from 'graphql';
import { envelop, useEngine, useSchema } from '@envelop/core';
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
  it('runs the extended validation phase for every execution sharing a context', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
        bar: String
      }
    `);
    const getEnveloped = envelop({
      plugins: [
        useEngine({ execute }),
        useSchema(schema),
        useExtendedValidation({
          rules: [
            ctx => ({
              Field(node) {
                if (node.name.value === 'bar') {
                  ctx.reportError(new GraphQLError('No bar'));
                }
              },
            }),
          ],
        }),
      ],
    });
    const enveloped = getEnveloped();
    const contextValue = await enveloped.contextFactory();
    const run = (query: string) =>
      enveloped.execute({ schema: enveloped.schema, document: parse(query), contextValue });
    expect(await run('{ foo }')).toEqual({ data: { foo: null } });
    expect(await run('{ bar }')).toEqual({ data: null, errors: [new GraphQLError('No bar')] });
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
            // eslint-disable-next-line require-yield
            async *subscribe() {
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
            // eslint-disable-next-line require-yield
            async *subscribe() {
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
  it('does not replace nulls produced by execution when patching partial results', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          items: [Item]
          broken: Item
        }
        type Item {
          id: ID!
          denied: String
        }
      `,
      resolvers: {
        Query: {
          items: () => [{ id: '1' }, { id: null }],
          broken: () => ({ id: null }),
        },
      },
    });
    const testkit = createTestkit(
      [
        useExtendedValidation({
          rejectOnErrors: false,
          rules: [
            context => ({
              OperationDefinition() {
                context.reportError(new GraphQLError('Denied', { path: ['items', '@', 'denied'] }));
                context.reportError(new GraphQLError('Denied', { path: ['broken', 'denied'] }));
              },
              Field(node) {
                return node.name.value === 'denied' ? null : undefined;
              },
            }),
          ],
        }),
      ],
      schema,
    );
    const result = await testkit.execute('{ items { id denied } broken { id denied } }');
    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ items: [{ id: '1', denied: null }, null], broken: null });
  });
});
