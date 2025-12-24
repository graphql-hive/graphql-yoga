import { getInstrumented } from '@envelop/instrumentation';
import type { ArbitraryObject, ComposeContext, GetEnvelopedFn, Optional, Plugin } from '@envelop/types';
import { createEnvelopOrchestrator, EnvelopOrchestrator } from './orchestrator.js';

type ExcludeFalsy<TArray extends any[]> = Exclude<TArray[0], null | undefined | false>[];

function notEmpty<T>(value: Optional<T>): value is T {
  return value != null;
}

export function envelop<PluginsType extends Optional<Plugin<any>>[]>(options: {
  plugins: PluginsType;
  enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>> {
  const plugins = options.plugins.filter(notEmpty);
  const orchestrator = createEnvelopOrchestrator<ComposeContext<ExcludeFalsy<PluginsType>>>({
    plugins,
  });
  const instrumentation = orchestrator.instrumentation;

  const getEnveloped = <TInitialContext extends ArbitraryObject>(
    context: TInitialContext = {} as TInitialContext,
  ) => {
    const instrumented = getInstrumented<{ context: any }>({ context });
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<
      TInitialContext,
      ComposeContext<ExcludeFalsy<PluginsType>>
    >;

    instrumented.fn(instrumentation?.init, orchestrator.init)(context);

    return {
      parse: instrumented.fn(instrumentation?.parse, typedOrchestrator.parse(context)),
      validate: instrumented.fn(instrumentation?.validate, typedOrchestrator.validate(context)),
      contextFactory: instrumented.fn(
        instrumentation?.context,
        typedOrchestrator.contextFactory(context as any),
      ),
      execute: instrumented.asyncFn(instrumentation?.execute, typedOrchestrator.execute),
      subscribe: instrumented.asyncFn(instrumentation?.subscribe, typedOrchestrator.subscribe),
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>;
}
