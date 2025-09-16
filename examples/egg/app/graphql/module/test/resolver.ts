import type { IResolvers } from '@graphql-tools/utils';

const testData = [
  { id: '1', name: 'Test 1' },
  { id: '2', name: 'Test 2' },
  { id: '3', name: 'Test 3' },
];

export const testResolver: IResolvers = {
  Query: {
    testList: () => {
      return {
        count: testData.length,
        data: testData,
      };
    },
  },
};
