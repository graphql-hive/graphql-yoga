import { oneLine, stripIndent } from 'common-tags';
import { buildSchema, print } from 'graphql';
import { diff } from 'jest-diff';
import { envelop, useSchema } from '@envelop/core';
import { useGraphQLJSEngine } from '@envelop/testing';
import { useFragmentArguments } from '../src/index.js';

function compareStrings(a: string, b: string): boolean {
  return a.includes(b);
}

expect.extend({
  toBeSimilarStringTo(received: string, expected: string) {
    const strippedReceived = oneLine`${received}`.replace(/\s\s+/g, ' ');
    const strippedExpected = oneLine`${expected}`.replace(/\s\s+/g, ' ');

    if (compareStrings(strippedReceived, strippedExpected)) {
      return {
        message: () =>
          `expected 
   ${received}
   not to be a string containing (ignoring indents)
   ${expected}`,
        pass: true,
      };
    } else {
      const diffString = diff(stripIndent`${expected}`, stripIndent`${received}`, {
        expand: this.expand,
      });
      const hasExpect = diffString && diffString.includes('- Expect');

      const message = hasExpect
        ? `Difference:\n\n${diffString}`
        : `expected 
      ${received}
      to be a string containing (ignoring indents)
      ${expected}`;

      return {
        message: () => message,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R, T> {
      /**
       * Normalizes whitespace and performs string comparisons
       */
      toBeSimilarStringTo(expected: string): R;
    }
  }
}

describe('useFragmentArguments', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      a: TestType
    }

    type TestType {
      a(b: String): Boolean
    }
  `);
  test('can inline fragment with argument', () => {
    const { parse } = envelop({
      plugins: [useGraphQLJSEngine(), useFragmentArguments(), useSchema(schema)],
    })({});
    const result = parse(/* GraphQL */ `
      fragment TestFragment($c: String) on Query {
        a(b: $c)
      }

      query TestQuery($a: String) {
          ...TestFragment(c: $a)
      }
    `);
    expect(print(result)).toBeSimilarStringTo(/* GraphQL */ `
      query TestQuery($a: String) {
        ... on Query {
          a(b: $a)
        }
      }
    `);
  });
});
