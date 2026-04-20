import {
  GraphQLFieldResolver,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { createYoga } from 'graphql-yoga';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';

const wrappingAppliedSymbol = Symbol('wrapping.applied');

function createResolverWrappingPlugin(callLog: string[]) {
  return {
    onSchemaChange({
      schema,
      replaceSchema,
    }: {
      schema: GraphQLSchema;
      replaceSchema: (s: GraphQLSchema) => void;
    }) {
      // @ts-expect-error - we know it is forbidden
      if (schema.extensions?.[wrappingAppliedSymbol]) {
        return;
      }

      const queryType = schema.getQueryType()!;
      const fields = queryType.getFields();
      const wrappedFields: Record<string, any> = {};

      for (const [fieldName, field] of Object.entries(fields)) {
        const originalResolve = field.resolve;
        wrappedFields[fieldName] = {
          type: field.type,
          resolve: (...args: Parameters<GraphQLFieldResolver<any, any>>) => {
            callLog.push(fieldName);
            return originalResolve?.apply(null, args);
          },
        };
      }

      const newSchema = new GraphQLSchema({
        ...schema.toConfig(),
        types: undefined,
        query: new GraphQLObjectType({
          name: 'Query',
          fields: wrappedFields,
        }),
      });
      newSchema.extensions = {
        ...schema.extensions,
        [wrappingAppliedSymbol]: true,
      };
      replaceSchema(newSchema);
    },
  };
}

describe('Middleware Compatibility', () => {
  it('should preserve schema extensions when adding defer/stream directives', () => {
    const testSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          hello: { type: GraphQLString, resolve: () => 'hello' },
        },
      }),
    });

    testSchema.extensions = {
      'somePlugin.marker': true,
      metadata: { version: 1 },
    };

    let capturedSchema: GraphQLSchema | undefined;

    createYoga({
      schema: testSchema,
      plugins: [
        useDeferStream(),
        {
          onSchemaChange({ schema }: { schema: GraphQLSchema }) {
            capturedSchema = schema;
          },
        } as any,
      ],
    });

    // Schema should have defer/stream directives added
    expect(capturedSchema).toBeDefined();
    expect(capturedSchema!.getDirective('defer')).toBeDefined();
    expect(capturedSchema!.getDirective('stream')).toBeDefined();
    // Extensions from the original schema should be preserved
    expect(capturedSchema!.extensions['somePlugin.marker']).toBe(true);
    expect(capturedSchema!.extensions['metadata']).toEqual({ version: 1 });
  });

  const middlewareAppliedSymbol = Symbol('middleware.applied');

  it('should not cause middleware-like plugins to re-apply when using string key markers', () => {
    let applyCount = 0;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          hello: { type: GraphQLString, resolve: () => 'hello' },
        },
      }),
    });

    createYoga({
      schema,
      plugins: [
        {
          onSchemaChange({
            schema,
            replaceSchema,
          }: {
            schema: GraphQLSchema;
            replaceSchema: (s: GraphQLSchema) => void;
          }) {
            // @ts-expect-error - we know it is forbidden
            if (schema.extensions?.[middlewareAppliedSymbol]) {
              return;
            }
            applyCount++;
            const newSchema = new GraphQLSchema(schema.toConfig());
            newSchema.extensions = {
              ...schema.extensions,
              [middlewareAppliedSymbol]: true,
            };
            replaceSchema(newSchema);
          },
        } as any,
        useDeferStream(),
      ],
    });

    // Middleware should apply exactly once — not re-triggered after
    // useDeferStream reconstructs the schema, because extensions are preserved
    expect(applyCount).toBe(1);
  });

  it('should execute @defer correctly when used with resolver-wrapping middleware', async () => {
    const callLog: string[] = [];

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          hello: {
            type: GraphQLString,
            resolve: () => 'hello',
          },
          goodbye: {
            type: GraphQLString,
            resolve: () =>
              new Promise<string>(resolve => process.nextTick(() => resolve('goodbye'))),
          },
        },
      }),
    });

    const yoga = createYoga({
      schema,
      plugins: [createResolverWrappingPlugin(callLog) as any, useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: '{ hello ... @defer { goodbye } }',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/mixed; boundary="-"');

    const text = await response.text();
    // Both fields should resolve through the middleware
    expect(text).toContain('"hello":"hello"');
    expect(text).toContain('"goodbye":"goodbye"');
    expect(callLog).toContain('hello');
    expect(callLog).toContain('goodbye');
  });

  it('should execute @stream correctly when used with resolver-wrapping middleware', async () => {
    const callLog: string[] = [];

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: {
            type: new GraphQLList(GraphQLString),
            async *resolve() {
              yield 'A';
              await new Promise(resolve => process.nextTick(resolve));
              yield 'B';
              await new Promise(resolve => process.nextTick(resolve));
              yield 'C';
            },
          },
        },
      }),
    });

    const yoga = createYoga({
      schema,
      plugins: [createResolverWrappingPlugin(callLog) as any, useDeferStream()],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: '{ items @stream(initialCount: 1) }',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/mixed; boundary="-"');

    const text = await response.text();
    expect(text).toContain('"items":["A"]');
    expect(callLog).toContain('items');
  });
});
