import { pipeline } from 'stream/promises';
import { APIGatewayEvent, Context } from 'aws-lambda';
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

export const handler = awslambda.streamifyResponse(
  async function handler(event, res, lambdaContext) {
    const response = await yoga.fetch(
      // Construct the URL
      event.path +
        '?' +
        // Parse query string parameters
        new URLSearchParams(
          (event.queryStringParameters as Record<string, string>) || {},
        ).toString(),
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
        res,
      },
    );

    // Create the metadata object for the response
    const metadata = {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };

    // Attach the metadata to the response stream
    const resWithMetadata = awslambda.HttpResponseStream.from(res, metadata);

    // Pipe the response body to the response stream
    if (response.body) {
      await pipeline(response.body, resWithMetadata);
    } else {
      resWithMetadata.end();
    }
  },
);
