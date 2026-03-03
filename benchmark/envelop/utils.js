/* eslint-disable */
import http from 'k6/http';

const graphqlEndpoint = `http://${__ENV.GRAPHQL_HOSTNAME || 'localhost'}:3000/graphql`;

/**
 *
 * @param {import('k6/http').Response} resp
 * @returns {boolean}
 */
export function checkNoErrors(resp) {
  try {
    const jsonBody = resp.json();
    return typeof jsonBody === 'object' && jsonBody !== null && !('errors' in jsonBody);
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function graphql({ query, operationName, variables }) {
  return http.post(
    graphqlEndpoint,
    JSON.stringify({
      query,
      operationName,
      variables,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        // eslint-disable-next-line no-undef
        'X-Test-Scenario': __ENV.MODE,
      },
    },
  );
}
