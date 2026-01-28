import { parseGETRequest } from '../src/plugins/request-parser/get';

test('parseGETRequest', () => {
  const request = new Request(
    'http://yoga/graphql?extensions=%7B%22persistedQuery%22:%7B%22sha256Hash%22:%22deadbeef8474a1374c4d5f01c0d2955773dcc50327bcd44f59e0b4579b42c194%22,%22version%22:1%7D%7D&operationName=GetFollowUpQuestionAnswer&variables=%7B%22question%22:%22Can%20you%20explain%20more?%22%7D',
    { method: 'GET' },
  );
  const result = parseGETRequest(request);
  expect(result).toEqual({
    extensions: {
      persistedQuery: {
        sha256Hash: 'deadbeef8474a1374c4d5f01c0d2955773dcc50327bcd44f59e0b4579b42c194',
        version: 1,
      },
    },
    operationName: 'GetFollowUpQuestionAnswer',
    query: undefined,
    variables: {
      question: 'Can you explain more?',
    },
  });
});
