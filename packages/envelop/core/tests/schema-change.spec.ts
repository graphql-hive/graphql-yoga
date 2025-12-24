import { buildSchema, GraphQLSchema } from 'graphql';
import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { Plugin } from '@envelop/types';
import { schema } from './common.js';

describe('schemaChange', () => {
  it('Should trigger schema change initially when schema is available', async () => {
    const spiedPlugin = createSpiedPlugin();
    createTestkit([spiedPlugin.plugin], schema);
    expect(spiedPlugin.spies.onSchemaChange).toHaveBeenCalledTimes(1);
  });

  it('Should not trigger schema change initially when schema is not available', async () => {
    const spiedPlugin = createSpiedPlugin();
    createTestkit([spiedPlugin.plugin]);
    expect(spiedPlugin.spies.onSchemaChange).toHaveBeenCalledTimes(0);
  });

  it("Should trigger schema change only for plugins that don't trigger the change itself", async () => {
    const pluginA = { onSchemaChange: jest.fn() };
    const pluginB = { onSchemaChange: jest.fn() };

    let setSchemaFn = (newSchema: GraphQLSchema) => {};

    const pluginTrigger: Plugin = {
      onSchemaChange: jest.fn(),
      onPluginInit({ setSchema }) {
        setSchemaFn = setSchema;
      },
    };

    createTestkit([pluginA, pluginB, pluginTrigger]);
    const newSchema = buildSchema(`type Query { foo: String! }`);
    setSchemaFn(newSchema);

    // Should not trigger this one because it's the one triggering the change
    expect(pluginTrigger.onSchemaChange).toHaveBeenCalledTimes(0);
    expect(pluginA.onSchemaChange).toHaveBeenCalledTimes(1);
    expect(pluginB.onSchemaChange).toHaveBeenCalledTimes(1);
  });

  it('should not trigger if the schema is the same', async () => {
    let setSchemaFn: (newSchema: GraphQLSchema) => void = (newSchema: GraphQLSchema) => {
      throw new Error('setSchemaFn not initialized');
    };
    const setSchemaPlugin: Plugin = {
      onPluginInit({ setSchema }) {
        setSchemaFn = setSchema;
      },
    };
    const onSchemaChangePlugin: Plugin = {
      onSchemaChange: jest.fn(),
    };
    const newSchema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    createTestkit([setSchemaPlugin, onSchemaChangePlugin]);
    setSchemaFn(schema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(1);
    setSchemaFn(schema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(1);
    setSchemaFn(newSchema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(2);
    setSchemaFn(schema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(3);
    setSchemaFn(newSchema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(4);
    setSchemaFn(newSchema);
    expect(onSchemaChangePlugin.onSchemaChange).toHaveBeenCalledTimes(4);
  });
});
