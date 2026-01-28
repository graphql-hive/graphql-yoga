## `@envelop/opentelemetry`

This plugins integrates [Open Telemetry](https://opentelemetry.io/) tracing with your GraphQL
execution. It also collects GraphQL execution errors and reports it as Exceptions.

You can use this plugin with any kind of Open Telemetry
[tracer](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/api.md#tracer),
and integrate it to any tracing/metric platform that supports this standard.

## Getting Started

```
yarn add @envelop/opentelemetry
```

## Usage Example

By default, this plugin prints the collected telemetry to the console:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useOpenTelemetry } from '@envelop/opentelemetry'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useOpenTelemetry({
      resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
      variables: true, // Includes the operation variables values as part of the metadata collected
      result: true // Includes execution result object as part of the metadata collected
    })
  ]
})
```

## Integration with `@opentelemetry` packages

By default, this plugin is creating a console exporter for exporting the `Span`s.

If you wish to use custom tracer/exporter, create it and pass it to the plugin factory function.

The following example is taking the current global tracer:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useOpenTelemetry } from '@envelop/opentelemetry'
import { trace } from '@opentelemetry/api'
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useOpenTelemetry(
      {
        resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
        variables: true, // Includes the operation variables values as part of the metadata collected
        result: true // Includes execution result object as part of the metadata collected
      },
      trace.getTracerProvider()
    )
  ]
})
```

This example integrates Jaeger tracer. To use this example, start by running Jaeger locally in a
Docker container (or, follow
[other options to run Jaeger locally](https://www.npmjs.com/package/@opentelemetry/exporter-jaeger#prerequisites)):

```
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useOpenTelemetry } from '@envelop/opentelemetry'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

// Create your exporter
const exporter = new JaegerExporter({
  serviceName: 'my-service-name',
  host: 'localhost',
  port: 6832
})

// Configure opentelmetry to run for your service
const provider = new BasicTracerProvider()
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
provider.register()

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useOpenTelemetry(
      {
        resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
        variables: true, // Includes the operation variables values as part of the metadata collected
        result: true // Includes execution result object as part of the metadata collected
      },
      provider
    )
  ]
})
```
