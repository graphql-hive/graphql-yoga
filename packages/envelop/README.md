[![GraphQLConf 2024 Banner: September 10-12, San Francisco. Hosted by the GraphQL Foundation](https://github.com/user-attachments/assets/bdb8cd5d-5186-4ece-b06b-b00a499b7868)](https://graphql.org/conf/2024/?utm_source=github&utm_medium=envelop&utm_campaign=readme)

## Envelop

`envelop` is a lightweight JavaScript (/TypeScript) library for wrapping GraphQL execution layer and
flow, allowing developers to develop, share and collaborate on GraphQL-related plugins while filling
the missing pieces in GraphQL implementations.

`envelop` aims to extend the GraphQL execution flow by adding plugins that enrich the feature set of
your application.

<p align="center">
  <img height="150" src="./logo.png">
</p>

`@envelop/core`:
[![npm version](https://badge.fury.io/js/%40envelop%2Fcore.svg)](https://www.npmjs.com/package/@envelop/core)

> Envelop is created and maintained by [The Guild](https://the-guild.dev/), and used in production
> by our clients.

### [Envelop Key Concepts](<(https://www.envelop.dev/docs#key-concepts)>)

- Lightweight
- Wraps the entire GraphQL pipeline, based on plugins
- Low-level API for extending the execution layer
- Agnostic to GraphQL Engine
- Agnostic to the HTTP layer
- Agnostic to the schema tools
- Plugins-based usage
- No vendor lock-in
- Amazing TypeScript support

[You can read more about the key concepts or Envelop here](https://www.envelop.dev/docs#key-concepts)

## [Getting Started](https://www.envelop.dev/docs/getting-started)

Start by adding the core of Envelop to your codebase:

```
yarn add graphql @envelop/core
```

Then, create a simple Envelop based on your GraphQL schema:

```ts
import * as GraphQLJS from 'graphql'
import { envelop, useEngine, useSchema } from '@envelop/core'

const mySchema = buildSchema(/* ... */) // GraphQLSchema

const getEnveloped = envelop({
  plugins: [useEngine(GraphQLJS), useSchema(mySchema)]
})
```

The result of `envelop` is a function that allows you to get everything you need for the GraphQL
execution: `parse`, `validate`, `contextBuilder` and `execute`. Use that to run the client's GraphQL
queries. Here's a pseudo-code example of how it should look like:

```ts
const httpServer = createServer()

httpServer.on('request', async (req, res) => {
  // Here you get the alternative methods that are bundled with your plugins
  // You can also pass the "req" to make it available for your plugins or GraphQL context.
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req })

  // Parse the initial request and validate it
  const { query, variables } = JSON.parse(req.payload)
  const document = parse(query)
  const validationErrors = validate(schema, document)

  if (validationErrors.length > 0) {
    return res.end(JSON.stringify({ errors: validationErrors }))
  }

  // Build the context and execute
  const context = await contextFactory(req)
  const result = await execute({
    document,
    schema,
    variableValues: variables,
    contextValue: context
  })

  // Send the response
  res.end(JSON.stringify(result))
})

httpServer.listen(3000)
```

Behind the scenes, this simple workflow allows you to use **Envelop plugins** and hook into the
entire request handling flow.

Here's a simple example for collecting metrics and logging all incoming requests, using the built-in
plugins:

```ts
const getEnveloped = envelop({
  plugins: [useEngine(GraphQLJS), useSchema(schema), useLogger(), useTiming()]
})
```

> [You can read more about here](https://www.envelop.dev/docs/getting-started)

## [Integrations / Examples](https://www.envelop.dev/docs/integrations)

[You can find the integrations and compatibility list, and code-based examples here](https://www.envelop.dev/docs/integrations)

## Available Plugins

You can explore all plugins in our [Plugins Hub](https://www.envelop.dev/plugins). If you wish your
plugin to be listed here and under PluginsHub, feel free to add your plugin information
[in this file](https://github.com/graphql-hive/envelop/edit/main/website/src/lib/plugins.ts#L23) and
create a Pull Request!

We provide a few built-in plugins within the `@envelop/core`, and many more plugins as standalone
packages.

**[Envelop's Plugin Hub](https://www.envelop.dev/plugins)**

## Sharing / Composing `envelop`s

After an `envelop` has been created, you can share it with others as a complete layer of plugins.
This is useful if you wish to create a predefined layer of plugins, and share it with others. You
can use it as a shell and as a base for writing shareable pieces of servers.

You can read more about
[Sharing and Composing Envelops here](https://www.envelop.dev/docs/composing-envelop).

## Write your own plugin!

Envelop plugins are just objects with functions, that provide contextual implementation for
before/after each phase, with a flexible API.

Here's a simple example that allows you to print the execution params:

```ts
const myPlugin = {
  onExecute({ args }) {
    console.log('Execution started!', { args })

    return {
      onExecuteDone({ result }) {
        console.log('Execution done!', { result })
      }
    }
  }
}

const getEnveloped = envelop({
  plugins: [
    /// ... other plugins ...,
    myPlugin
  ]
})
```

[For a complete guide and API docs for custom plugins, please refer to Envelop website](https://www.envelop.dev/docs/plugins)

### Contributing

If this is your first time contributing to this project, please do read our
[Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md)
before you get started off.

Feel free to open issues and pull requests. We always welcome support from the community.

### Code of Conduct

Help us keep Envelop open and inclusive. Please read and follow our
[Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted
from [Contributor Covenant](https://www.contributor-covenant.org/)

### License

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/graphql-hive/envelop/master/LICENSE)

MIT
