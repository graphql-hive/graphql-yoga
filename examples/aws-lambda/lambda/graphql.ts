import { finished, pipeline } from 'stream/promises';
import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { createSchema, createYoga } from 'graphql-yoga';

const yoga = createYoga<{
  event: LambdaFunctionURLEvent;
  lambdaContext: Context;
  res: awslambda.ResponseStream;
}>({
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
      `https://${event.requestContext.domainName}/${event.rawPath}?${event.rawQueryString}`,
      {
        method: event.requestContext.http.method,
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

    const contentType = response.headers.get('content-type');
    if (contentType) {
      // Set the content type of the response stream
      res.setContentType(contentType);
    }

    // Create the metadata object for the response
    const metadata = {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };

    // Attach the metadata to the response stream
    res = awslambda.HttpResponseStream.from(res, metadata);

    // Pipe the response body to the response stream
    if (response.body) {
      await pipeline(response.body, res);
    }

    // End the response stream
    res.end();

    await finished(res);
  },
);
