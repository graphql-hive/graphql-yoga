/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/// @ts-check
import http from 'k6/http';

const graphqlEndpoint = `http://${__ENV.GRAPHQL_HOSTNAME || 'localhost'}:3000/graphql`;

export function checkNoErrors(resp) {
  try {
    return !('errors' in resp.json());
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
