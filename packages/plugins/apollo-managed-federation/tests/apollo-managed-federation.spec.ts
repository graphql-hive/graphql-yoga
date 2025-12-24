import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { createYoga } from 'graphql-yoga';
import { SupergraphSchemaManager, SupergraphSchemaManagerOptions } from '@graphql-tools/federation';
import { useManagedFederation } from '@graphql-yoga/plugin-apollo-managed-federation';
import { Response } from '@whatwg-node/fetch';
import { fakePromise } from '@whatwg-node/server';
import { supergraphSdl } from './fixtures/supergraph';

describe('Apollo Managed Federation', () => {
  let manager: SupergraphSchemaManager;
  let mockFetchError: jest.Mock<Response>;

  beforeEach(() => {
    mockFetchError = jest.fn(() =>
      Response.json({
        data: {
          routerConfig: {
            __typename: 'FetchError',
            code: 'FETCH_ERROR',
            message: 'Test error message',
            minDelaySeconds: 0.1,
          },
        },
      }),
    );
  });
  afterEach(() => {
    manager?.stop();
    jest.clearAllMocks();
  });

  it('should expose the managed federation schema from GraphOS', async () => {
    const yoga = createYoga({
      plugins: [
        useManagedFederation(
          makeManager({
            fetch: mockSDL,
          }),
        ),
      ],
      logging: false,
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id, username, name } }' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        users: [
          { id: '1', name: 'Alice', username: 'alice' },
          { id: '2', name: 'Bob', username: 'bob' },
        ],
      },
    });
  });

  it('should wait for the schema before letting requests through', async () => {
    const yoga = createYoga({
      plugins: [
        useManagedFederation(
          makeManager({
            fetch: async () => {
              await setTimeout$(100);
              return mockSDL();
            },
          }),
        ),
      ],
      logging: false,
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id, username, name } }' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        users: [
          { id: '1', name: 'Alice', username: 'alice' },
          { id: '2', name: 'Bob', username: 'bob' },
        ],
      },
    });
  });

  it('should respond with an error if the schema failed to load', async () => {
    const yoga = createYoga({
      plugins: [
        useManagedFederation(
          makeManager({
            fetch: mockFetchError,
          }),
        ),
      ],
      logging: false,
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id, username, name } }' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      errors: [{ message: 'Supergraph failed to load' }],
    });
  });

  it('should restart polling by default on failure', async () => {
    const yoga = createYoga({
      plugins: [
        useManagedFederation(
          makeManager({
            fetch: mockFetchError,
          }),
        ),
      ],
      logging: false,
    });

    const failure = jest.fn();
    manager.addEventListener('failure', failure);

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id, username, name } }' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      errors: [{ message: 'Supergraph failed to load' }],
    });

    expect(mockFetchError).toHaveBeenCalledTimes(3);
    expect(failure).toHaveBeenCalledTimes(1);

    // It should respect the backoff returned by the GraphOS API before restarting the polling
    await setTimeout$(0.35 * 1000);

    expect(mockFetchError).toHaveBeenCalledTimes(6);
    expect(failure).toHaveBeenCalledTimes(2);
  });

  const mockSDL = () =>
    fakePromise(
      Response.json({
        data: {
          routerConfig: {
            __typename: 'RouterConfigResult',
            minDelaySeconds: 0.1,
            id: 'test-id-1',
            supergraphSdl,
            messages: [],
          },
        },
      }),
    );

  function makeManager(options: SupergraphSchemaManagerOptions) {
    manager = new SupergraphSchemaManager({
      onSubschemaConfig(config) {
        config.executor = (async () => {
          if (config.name === 'SERVICE_AUTH') {
            return {
              data: {
                users: [
                  { id: '1', username: 'alice' },
                  { id: '2', username: 'bob' },
                ],
              },
            };
          }
          if (config.name === 'SERVICE_IDENTITY') {
            return {
              data: {
                _entities: [{ name: 'Alice' }, { name: 'Bob' }],
              },
            };
          }
          return null;
        }) as typeof config.executor;
      },
      ...options,
    });
    return manager;
  }
});
