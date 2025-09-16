import { exec } from 'node:child_process';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { promisify } from 'node:util';

export const execPromise = promisify(exec);

export async function getCommitId() {
  const { stdout } = await execPromise('git rev-parse HEAD');
  return (process.env.COMMIT_ID || stdout).toString().trim();
}

export async function waitForEndpoint(
  endpoint: string,
  retries: number,
  timeout = 10_000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.info(`Trying to connect to ${endpoint} (attempt ${attempt}/${retries})...`);
    try {
      const r = await fetch(endpoint, {
        method: 'GET',
        headers: {
          accept: 'text/html',
        },
      });

      if (r.status !== 200) {
        const body = await r.text();
        throw new Error(`Endpoint not ready yet, status code is ${r.status}, response is ${body}`);
      }

      const response = await r.text();

      if (response.includes('Vercel')) {
        throw new Error(`Endpoint not ready yet, response is ${response}`);
      }

      return true;
    } catch (e) {
      console.warn(
        `Failed to connect to endpoint: ${endpoint}, waiting ${timeout}ms...`,
        e.message,
      );

      await setTimeout$(timeout);
    }
  }

  throw new Error(`Failed to connect to endpoint: ${endpoint} (attempts: ${retries})`);
}

export function env(name: string): string {
  if (!process.env[name]) {
    throw new Error(`Environment variable ${name} not set`);
  }

  return process.env[name];
}

export async function assertGraphiQL(endpoint: string) {
  console.log(`ℹ️ Looking for valid Yoga GraphiQL in ${endpoint}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      accept: 'text/html',
    },
  });

  const html = await response.text();

  if (response.status !== 200) {
    console.warn(`⚠️ Invalid GraphiQL status code:`, response.status, ', body:', html);

    throw new Error(`Failed to locate GraphiQL: invalid status code (${response.status})`);
  }

  if (!html.includes('<title>Yoga GraphiQL</title>')) {
    console.warn(`⚠️ Invalid GraphiQL body:`, {
      html,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    });

    throw new Error(`Failed to locate GraphiQL: failed to find signs for GraphiQL HTML`);
  }

  console.log(`\t✅ All good!`);
}

const DUMMY_QUERY = /* GraphQL */ `
  query {
    greetings
  }
`;
const DUMMY_VARIABLES = {};

export async function assertQuery(
  endpoint: string,
  query: string = DUMMY_QUERY,
  variables: Record<string, string> = DUMMY_VARIABLES,
) {
  console.log(`ℹ️ Trying to run a GraphQL operation against ${endpoint}:`);
  console.log(`\t operation: ${query}`);
  console.log(`\t variables: ${JSON.stringify(variables, null, 2)}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status !== 200) {
    console.warn(`⚠️ Invalid GraphQL status code response:`, response.status);

    throw new Error(`Failed to run GraphQL request, response error code is: ${response.status}`);
  }

  const responseJson = await response.json();

  if (responseJson.errors) {
    console.warn(`⚠️ Found GraphQL response with errors:`, responseJson.errors);

    throw new Error(
      `Failed to run GraphQL request, got a valid 200 response, but with GraphQL errors: ${JSON.stringify(
        responseJson.errors,
      )}`,
    );
  }

  if (query !== DUMMY_QUERY) {
    return responseJson;
  }

  if (responseJson.data?.greetings !== 'This is the `greetings` field of the root `Query` type') {
    console.warn(`⚠️ Unexpected GraphQL response content for default query:`, responseJson);

    throw new Error(`Expected to find in respnse "data.greetings" with the correct content value`);
  }

  console.log(`\t✅ All good!`);
}

export { promises as fsPromises } from 'node:fs';
