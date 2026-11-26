import { pipeline } from 'stream/promises';
import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { createSchema, createYoga } from 'graphql-yoga';

const yoga = createYoga<{
  event: LambdaFunctionURLEvent;
  lambdaContext: Context;
  res: awslambda.HttpResponseStream;
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

export const handler = awslambda.streamifyResponse(async function handler(
  event: LambdaFunctionURLEvent,
  res,
  lambdaContext,
) {
  const response = await yoga.fetch(
    // Construct the URL
    `https://${event.requestContext.domainName}${event.requestContext.http.path}?${event.rawQueryString}`,
    {
      method: event.requestContext.http.method,
      headers: event.headers as HeadersInit,
      // Parse the body if needed
      body: event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body,
    },
    {
      event,
      lambdaContext,
      res,
    },
  );

  // `Set-Cookie` can appear multiple times, so it cannot be represented in the headers object.
  // Lambda expects each cookie as a separate entry in `cookies` instead.
  const headers = Object.fromEntries(response.headers.entries());
  delete headers['set-cookie'];

  // Attach the metadata to the response stream
  res = awslambda.HttpResponseStream.from(res, {
    statusCode: response.status,
    headers,
    cookies: response.headers.getSetCookie(),
  });

  // Pipe the response body to the response stream
  if (response.body) {
    await pipeline(response.body, res);
  }

  // End the response stream
  res.end();
});
