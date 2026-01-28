import { GraphQLError, GraphQLSchema, validate } from 'graphql';
import { assertSingleExecutionValue, createSpiedPlugin, createTestkit } from '@envelop/testing';
import { useValidationRule } from '../src/plugins/use-validation-rule.js';
import { query, schema } from './common.js';

describe('validate', () => {
  it('Should call before validate and after validate correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query);
    expect(spiedPlugin.spies.beforeValidate).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeValidate).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      params: {
        schema: expect.any(GraphQLSchema),
        documentAST: expect.any(Object),
        options: undefined,
        rules: expect.any(Array),
        typeInfo: undefined,
      },
      addValidationRule: expect.any(Function),
      setResult: expect.any(Function),
      setValidationFn: expect.any(Function),
      validateFn: validate,
    });

    expect(spiedPlugin.spies.afterValidate).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterValidate).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      result: [],
      setResult: expect.any(Function),
      valid: true,
    });
  });

  it('Should allow to replace validate function', async () => {
    const replacementFn = jest.fn(validate);
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn }) => {
            setValidationFn(replacementFn);
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(1);
    expect(replacementFn).toHaveBeenCalledWith(
      expect.any(GraphQLSchema),
      expect.any(Object),
      expect.any(Array),
      undefined,
      undefined,
    );
  });

  it('Should allow to set validation result and avoid running validate', async () => {
    const replacementFn = jest.fn(validate);
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn, setResult }) => {
            setValidationFn(replacementFn);
            setResult([]);
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(0);
  });

  it('Should allow to manipulate validation results during execution and effect result', async () => {
    const e = new GraphQLError('failed');
    const replacementFn = jest.fn(() => {
      return [e];
    });

    const after = jest.fn();
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn }) => {
            setValidationFn(replacementFn);
            return after;
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(after).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith({
      valid: false,
      result: [e],
      setResult: expect.any(Function),
      context: expect.any(Object),
      extendContext: expect.any(Function),
    });
  });

  it('Should allow to add validation rules (reportError)', async () => {
    const teskit = createTestkit(
      [
        {
          onValidate: ({ addValidationRule }) => {
            addValidationRule((context: any) => {
              context.reportError(new GraphQLError('Invalid!'));
              return {};
            });
          },
        },
      ],
      schema,
    );

    const r = await teskit.execute(query);
    assertSingleExecutionValue(r);

    expect(r.errors).toBeDefined();
    expect(r.errors!.length).toBe(1);
    expect(r.errors![0]!.message).toBe('Invalid!');
  });

  it('Should allow to add validation rules (reportError, `useValidationRule`)', async () => {
    const teskit = createTestkit(
      [
        useValidationRule((context: any) => {
          context.reportError(new GraphQLError('Invalid!'));
          return {};
        }),
      ],
      schema,
    );

    const r = await teskit.execute(query);
    assertSingleExecutionValue(r);

    expect(r.errors).toBeDefined();
    expect(r.errors!.length).toBe(1);
    expect(r.errors![0]!.message).toBe('Invalid!');
  });

  it('Should allow to add validation rules (throw)', async () => {
    const teskit = createTestkit(
      [
        {
          onValidate: ({ addValidationRule }) => {
            addValidationRule(() => {
              throw new GraphQLError('Invalid!');
            });
          },
        },
      ],
      schema,
    );

    const r = await teskit.execute(query);
    assertSingleExecutionValue(r);

    expect(r.errors).toBeDefined();
    expect(r.errors!.length).toBe(1);
    expect(r.errors![0]!.message).toBe('Invalid!');
  });

  it('Should not replace default rules when adding new ones', async () => {
    const teskit = createTestkit(
      [
        {
          onValidate: ({ addValidationRule }) => {
            addValidationRule(
              () => ({}), // noop
            );
          },
        },
      ],
      schema,
    );

    const r = await teskit.execute('{ woah }');
    assertSingleExecutionValue(r);

    expect(r).toMatchInlineSnapshot(`
      {
        "errors": [
          [GraphQLError: Cannot query field "woah" on type "Query".],
        ],
      }
    `);
  });

  it('should preserve referential stability of the context', async () => {
    const testKit = createTestkit(
      [
        {
          onValidate({ extendContext }) {
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
