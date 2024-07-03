import { Writable } from 'node:stream';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createSchema, createYoga } from 'graphql-yoga';

const yoga = createYoga<{
  event: APIGatewayEvent;
  lambdaContext: Context;
}>({
  graphqlEndpoint: '/graphql',
  landingPage: false,
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
      }
    `,
    resolvers: {
      Query: {
        greetings: () => 'This is the `greetings` field of the root `Query` type',
      },
    },
  }),
});

export const handler = awslambda.streamifyResponse(async function handler(
  event: APIGatewayEvent,
  responseStream: Writable<Uint8Array>,
  lambdaContext: Context,
): Promise<APIGatewayProxyResult> {
  const response = await yoga.fetch(
    // Construct the URL
    event.path +
      '?' +
      // Parse query string parameters
      new URLSearchParams((event.queryStringParameters as Record<string, string>) || {}).toString(),
    {
      method: event.httpMethod,
      headers: event.headers as HeadersInit,
      // Parse the body
      body: event.body
        ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
        : undefined,
    },
    {
      event,
      lambdaContext,
    },
  );

  // Create the metadata object for the response
  const metadata = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  // Attach the metadata to the response stream
  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  if (response.body) {
    // Pipe the response body to the response stream
    response.body.pipe(responseStream);
  } else {
    responseStream.end();
  }
});
