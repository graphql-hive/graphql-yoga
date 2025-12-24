import { createTestkit } from '@envelop/testing';
import { query, schema } from './common';

describe('enveloped', () => {
  it('should preserve referential stability of the context', async () => {
    const testKit = createTestkit(
      [
        {
          onEnveloped({ extendContext }) {
            extendContext({ foo: 'bar' });
          },
        },
      ],
      schema,
    );

    const context: any = {};
    await testKit.execute(query, {}, context);

    expect(context.foo).toEqual('bar');
  });
});
