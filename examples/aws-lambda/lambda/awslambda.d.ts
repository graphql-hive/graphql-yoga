import type { Writable } from 'node:stream';
import type { Context, Handler, LambdaFunctionURLEvent } from 'aws-lambda';

declare global {
  namespace awslambda {
    export namespace HttpResponseStream {
      function from(
        responseStream: ResponseStream,
        metadata: {
          statusCode?: number;
          headers?: Record<string, string>;
        },
      ): ResponseStream;
    }

    export type ResponseStream = Writable & {
      setContentType(type: string): void;
    };

    export type StreamifyHandler = (
      event: LambdaFunctionURLEvent,
      responseStream: ResponseStream,
      context: Context,
    ) => Promise<unknown>;

    export function streamifyResponse(handler: StreamifyHandler): Handler<APIGatewayEvent>;
  }
}
