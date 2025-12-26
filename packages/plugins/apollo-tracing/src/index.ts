import { TracingFormat } from 'apollo-tracing';
import { GraphQLType, ResponsePath, responsePathAsArray } from 'graphql';
import { handleStreamOrSingleExecutionResult, Plugin } from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';

const HR_TO_NS = 1e9;
const NS_TO_MS = 1e6;

// Not exported by `apollo-tracing`.
interface ResolverCall {
  path: ResponsePath;
  fieldName: string;
  parentType: GraphQLType;
  returnType: GraphQLType;
  startOffset: [number, number];
  endOffset?: [number, number];
}

function durationHrTimeToNanos(hrtime: [number, number]) {
  return hrtime[0] * HR_TO_NS + hrtime[1];
}

const deltaFrom = (hrtime: [number, number]): { ms: number; ns: number } => {
  const delta = process.hrtime(hrtime);
  const ns = delta[0] * HR_TO_NS + delta[1];

  return {
    ns,
    get ms() {
      return ns / NS_TO_MS;
    },
  };
};

const apolloTracingSymbol = Symbol('apolloTracing');

type TracingContextObject = {
  startTime: Date;
  resolversTiming: ResolverCall[];
  hrtime: [number, number];
};

export const useApolloTracing = (): Plugin<{
  [apolloTracingSymbol]: TracingContextObject;
}> => {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOnResolve(({ info, context }) => {
          const ctx = context[apolloTracingSymbol];
          // Taken from https://github.com/apollographql/apollo-server/blob/main/packages/apollo-tracing/src/index.ts
          const resolverCall: ResolverCall = {
            path: info.path,
            fieldName: info.fieldName,
            parentType: info.parentType,
            returnType: info.returnType,
            startOffset: process.hrtime(ctx.hrtime),
          };
          return () => {
            resolverCall.endOffset = process.hrtime(ctx.hrtime);
            ctx.resolversTiming.push(resolverCall);
          };
        }),
      );
    },
    onExecute(onExecuteContext) {
      const ctx: TracingContextObject = {
        startTime: new Date(),
        resolversTiming: [],
        hrtime: process.hrtime(),
      };

      onExecuteContext.extendContext({ [apolloTracingSymbol]: ctx });

      return {
        onExecuteDone(payload) {
          const endTime = new Date();

          const tracing: TracingFormat = {
            version: 1,
            startTime: ctx.startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: deltaFrom(ctx.hrtime).ns,
            execution: {
              resolvers: ctx.resolversTiming.map(resolverCall => {
                const startOffset = durationHrTimeToNanos(resolverCall.startOffset);
                const duration = resolverCall.endOffset
                  ? durationHrTimeToNanos(resolverCall.endOffset) - startOffset
                  : 0;

                return {
                  path: [...responsePathAsArray(resolverCall.path)],
                  parentType: resolverCall.parentType.toString(),
                  fieldName: resolverCall.fieldName,
                  returnType: resolverCall.returnType.toString(),
                  startOffset,
                  duration,
                };
              }),
            },
          };

          return handleStreamOrSingleExecutionResult(payload, ({ result }) => {
            result.extensions = result.extensions || {};
            result.extensions['tracing'] = tracing;
          });
        },
      };
    },
  };
};
