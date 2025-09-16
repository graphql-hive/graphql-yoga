<div align="center">
  <br />

  <h3>
    <a href="https://the-guild.dev/graphql/yoga-server">GraphQL Yoga</a> plugin with Apollo Federation for <a href="https://nestjs.com">NestJS</a>
  </h3>

  <h6>Fully-featured GraphQL server as a plugin for the progressive Node.js framework.</h6>

<p>
Check out <a href="https://the-guild.dev/graphql/yoga-server/docs/integrations/integration-with-nestjs">Yoga's documentation about NestJS integration</a>!
</p>

  <br />
</div>

## Getting started

### Install

```shell
npm i @nestjs/graphql graphql-yoga graphql @graphql-yoga/nestjs-federation
```

### Create application module

```typescript
import { YogaFederationDriver, YogaFederationDriverConfig } from '@graphql-yoga/nestjs-federation'
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'

@Module({
  imports: [
    GraphQLModule.forRoot<YogaFederationDriverConfig>({
      driver: YogaFederationDriver,
      typePaths: ['**/*.graphql']
    })
  ]
})
export class AppModule {}
```

### Develop GraphQL

This is just a federation and gateway driver; meaning, everything else should work as
[showcased in NestJS federation documentation](https://docs.nestjs.com/graphql/federation).

## Contributing

If this is your first time contributing to this project, please do read our
[Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md)
before you get started off.

Feel free to open issues, pull requests and create discussions. Community support is always welcome!

## Code of Conduct

Help us keep Yoga open and inclusive. Please read and follow our
[Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted
from [Contributor Covenant](https://www.contributor-covenant.org/).
