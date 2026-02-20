import { createTestkit } from '@envelop/testing';
import { envelop } from '../src/index.js';
import { useEnvelop } from '../src/plugins/use-envelop.js';
import { query, schema } from './common.js';

describe('plugin init', () => {
  describe('addPlugin', () => {
    it('should call plugins in the correct order', async () => {
      let callNumber = 0;
      const createPlugin = (order: number) => ({
        order,
        onExecute() {
          expect(callNumber).toBe(order);

          callNumber++;
        },
      });

      const teskit = createTestkit(
        [
          createPlugin(0),
          {
            onPluginInit({ addPlugin }) {
              addPlugin(createPlugin(1));
              addPlugin(createPlugin(2));
            },
          },
          {
            onPluginInit({ addPlugin }) {
              addPlugin(createPlugin(3));
              addPlugin({
                onPluginInit({ addPlugin }) {
                  addPlugin(createPlugin(4));
                },
              });
              addPlugin(createPlugin(5));
            },
          },
          createPlugin(6),
        ],
        schema,
      );
      await teskit.execute(query, {});

      expect.assertions(7);
    });
  });
});
