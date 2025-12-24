import { FieldNode, parse, visit } from 'graphql';
import { assertSingleExecutionValue, createSpiedPlugin, createTestkit } from '@envelop/testing';
import { query, schema } from './common.js';

describe('parse', () => {
  it('Should call before parse and after parse correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query);
    expect(spiedPlugin.spies.beforeParse).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeParse).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      params: {
        options: undefined,
        source: query,
      },
      parseFn: parse,
      setParseFn: expect.any(Function),
      setParsedDocument: expect.any(Function),
    });

    expect(spiedPlugin.spies.afterParse).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterParse).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      result: expect.any(Object),
      replaceParseResult: expect.any(Function),
    });
  });

  it('Should allow to replace parse function with a custom function', async () => {
    const replacementFn = jest.fn(parse);
    const teskit = createTestkit(
      [
        {
          onParse: ({ setParseFn }) => {
            setParseFn(replacementFn);
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(1);
    expect(replacementFn).toHaveBeenCalledWith(query, undefined);
  });

  it('Should allow to set parsed document before actual parsing, and avoid running parseFn', async () => {
    const replacementFn = jest.fn(parse);
    const afterFn = jest.fn();
    const fakeRes = parse(`query meAlt { me { id }}`);
    const teskit = createTestkit(
      [
        {
          onParse: ({ setParseFn, setParsedDocument }) => {
            setParseFn(replacementFn);
            setParsedDocument(fakeRes);

            return afterFn;
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(0);
    expect(afterFn).toHaveBeenCalledTimes(1);
    expect(afterFn).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      result: fakeRes,
      replaceParseResult: expect.any(Function),
    });
  });

  it('Should allow to manipulate parsed document after parsing', async () => {
    const afterFn = jest.fn(({ result, replaceParseResult }) => {
      const modifiedDoc = visit(result, {
        Field: node => {
          if (node.name.value === 'me') {
            return {
              ...node,
              alias: {
                kind: 'Name',
                value: 'currentUser',
              },
            } as FieldNode;
          }

          return node;
        },
      });

      replaceParseResult(modifiedDoc);
    });

    const teskit = createTestkit(
      [
        {
          onParse: () => afterFn,
        },
      ],
      schema,
    );
    const result = await teskit.execute(query);
    assertSingleExecutionValue(result);
    expect(afterFn).toHaveBeenCalledTimes(1);
    expect(result.data?.currentUser).toBeDefined();
    expect(result.data?.me).not.toBeDefined();
  });

  it('should preserve referential stability of the context', async () => {
    const testKit = createTestkit(
      [
        {
          onParse({ extendContext }) {
            extendContext({ foo: 'bar' });

            return ({ extendContext }) => {
              extendContext({ bar: 'foo' });
            };
          },
        },
      ],
      schema,
    );

    const context: any = {};
    await testKit.execute(query, {}, context);

    expect(context.foo).toEqual('bar');
    expect(context.bar).toEqual('foo');
  });
});
