import { Module } from '@nestjs/common';
import { GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { useTestApp } from '../../nestjs/__tests__/utils/app';
import { YogaFederationDriver, YogaFederationDriverConfig } from '../src';

@Resolver()
class HelloResolver {
  @Query()
  hello() {
    return 'world';
  }
}

@Module({
  providers: [HelloResolver],
  imports: [
    GraphQLModule.forRoot<YogaFederationDriverConfig<'node'>>({
      driver: YogaFederationDriver,
      typeDefs: /* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Query {
          hello: String!
        }
      `,
    }),
  ],
})
class SubgraphModule {}

const { getUrl } = useTestApp(
  () => Test.createTestingModule({ imports: [SubgraphModule] }).compile(),
  () => new NodeAdapter(),
);

it('should serve the subgraph schema', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ hello _service { sdl } }' }),
  });
  expect(res.status).toBe(200);
  const result = await res.json();
  expect(result.data.hello).toBe('world');
  expect(result.data._service.sdl).toContain('hello: String!');
});

it('should return an inline trace when the gateway requests one', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apollo-federation-include-trace': 'ftv1',
    },
    body: JSON.stringify({ query: '{ hello }' }),
  });
  expect(res.status).toBe(200);
  const result = await res.json();
  expect(result.data.hello).toBe('world');
  expect(typeof result.extensions?.ftv1).toBe('string');
});

it('should not return an inline trace when the gateway does not request one', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ hello }' }),
  });
  expect(res.status).toBe(200);
  const result = await res.json();
  expect(result.data.hello).toBe('world');
  expect(result.extensions?.ftv1).toBeUndefined();
});
