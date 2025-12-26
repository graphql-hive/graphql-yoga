import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useResourceLimitations } from '../src/index.js';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    scalar ConnectionInt

    type Query {
      viewer: User
    }

    type User {
      id: ID!
      repositories(first: Int, last: Int, after: String): RepositoryConnection!
      repositoriesCustom(
        first: ConnectionInt
        last: ConnectionInt
        after: String
      ): RepositoryConnection!
    }

    type Repository {
      id: ID!
      name: String!
      issues(first: Int, last: Int, after: String): IssueConnection!
    }

    type PageInfo {
      hasNext: Boolean!
    }

    type RepositoryEdge {
      node: Repository!
      cursor: String!
    }

    type RepositoryConnection {
      edges: [RepositoryEdge!]!
      pageInfo: PageInfo
    }

    type Issue {
      id: ID!
      title: String!
      bodyHTML: String!
    }

    type IssueEdge {
      node: Issue!
      cursor: String!
    }

    type IssueConnection {
      edges: [IssueEdge!]!
      pageInfo: PageInfo
    }
  `,
});

describe('useResourceLimitations', () => {
  it('requires the usage of either the first or last field on fields that resolve to a Connection type.', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Missing pagination argument for field 'repositories'. Please provide either the 'first' or 'last' field argument.",
    );
  });
  it('requires non-null values on either the first or last field on fields that resolve to a Connection type.', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: null, last: null) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Missing pagination argument for field 'repositories'. Please provide either the 'first' or 'last' field argument.",
    );
  });
  it('requires the usage of either the first or last field on fields that resolve to a Connection type (other argument provided).', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(after: "abc") {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Missing pagination argument for field 'repositories'. Please provide either the 'first' or 'last' field argument.",
    );
  });
  it('ignores null in last field', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: 1, last: null) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 1,
      },
    });
  });
  it('requires the first field to be at least 1', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: 0) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'first' argument must be an integer within 1-100.",
    );
  });
  it('requires the first field to be at least a custom minimum value', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ paginationArgumentMinimum: 2, extensions: true })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: 1) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'first' argument must be an integer within 2-100.",
    );
  });
  it('requires the first field to be not higher than 100', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: 101) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'first' argument must be an integer within 1-100.",
    );
  });
  it('requires the first field to be not higher than a custom maximum value', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ paginationArgumentMaximum: 99, extensions: true })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'first' argument must be an integer within 1-99.",
    );
  });
  it('ignores null in first field', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(first: null, last: 1) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 1,
      },
    });
  });
  it('requires the last field to be at least 1', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 0) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'last' argument must be an integer within 1-100.",
    );
  });
  it('requires the last field to be at least a custom minimum value', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ paginationArgumentMinimum: 2, extensions: true })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 1) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'last' argument must be an integer within 2-100.",
    );
  });
  it('requires the last field to be not higher than 100', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 101) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'last' argument must be an integer within 1-100.",
    );
  });
  it('requires the last field to be not higher than a custom maximum value', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ paginationArgumentMaximum: 99, extensions: true })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toEqual(1);
    expect(result.errors?.[0]?.message).toEqual(
      "Invalid pagination argument for field 'repositories'. The value for the 'last' argument must be an integer within 1-99.",
    );
  });
  it('calculates node cost (single)', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 100,
      },
    });
  });
  it('calculates node cost on connections with custom argument types (single)', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ paginationArgumentScalars: ['ConnectionInt'], extensions: true })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositoriesCustom(first: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 100,
      },
    });
  });
  it('calculates node cost (nested)', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 100) {
            edges {
              node {
                name
                issues(first: 10) {
                  edges {
                    node {
                      title
                      bodyHTML
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 1100,
      },
    });
  });
  it('calculates node cost (multiple nested)', async () => {
    const testkit = createTestkit([useResourceLimitations({ extensions: true })], schema);
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 100) {
            edges {
              node {
                name
                issues(first: 10) {
                  edges {
                    node {
                      title
                      bodyHTML
                    }
                  }
                }
              }
            }
          }
          more: repositories(last: 1) {
            edges {
              node {
                name
                issues(first: 2) {
                  edges {
                    node {
                      title
                      bodyHTML
                    }
                  }
                }
              }
            }
          }
          # These should not count towards the total due to invalid argument types
          repositoriesCustom(first: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 1104,
      },
    });
  });
  it('stops execution if node cost limit is exceeded', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ extensions: true, nodeCostLimit: 20 })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          repositories(last: 19) {
            edges {
              node {
                name
                issues(first: 2) {
                  edges {
                    node {
                      title
                      bodyHTML
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 19 * 2 + 19,
      },
    });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toEqual(
      'Cannot request more than 20 nodes in a single document. Please split your operation into multiple sub operations or reduce the amount of requested nodes.',
    );
  });
  it('minimum cost is always 1', async () => {
    const testkit = createTestkit(
      [useResourceLimitations({ extensions: true, nodeCostLimit: 20 })],
      schema,
    );
    const result = await testkit.execute(/* GraphQL */ `
      query {
        viewer {
          id
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      resourceLimitations: {
        nodeCost: 1,
      },
    });
    expect(result.errors).toBeUndefined();
  });
});
