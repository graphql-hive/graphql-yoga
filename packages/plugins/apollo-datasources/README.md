## `@envelop/apollo-datasources`

This plugin integrates Apollo DataSources into Envelop.

## Getting Started

```
yarn add @envelop/apollo-datasources
```

## Usage Example

```ts
import { RESTDataSource } from 'apollo-datasource-rest'
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { useApolloDataSources } from '@envelop/apollo-datasources'
import { envelop, useEngine } from '@envelop/core'

class MoviesAPI extends RESTDataSource {
  constructor() {
    super()
    this.baseURL = 'https://movies-api.example.com/'
  }

  async getMovie(id) {
    return this.get(`movies/${encodeURIComponent(id)}`)
  }

  async getMostViewedMovies(limit = 10) {
    const data = await this.get('movies', {
      per_page: limit,
      order_by: 'most_viewed'
    })
    return data.results
  }
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useApolloDataSources({
      dataSources() {
        return {
          moviesAPI: new MoviesAPI()
        }
      }
      // To provide a custom cache, you can use the following code (InMemoryLRUCache is used by default):
      // cache: new YourCustomCache()
    })
  ]
})
```
