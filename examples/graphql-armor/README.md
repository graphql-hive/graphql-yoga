# GraphQL Armor example

[GraphQL Armor](https://github.com/Escape-Technologies/graphql-armor) is a highly customizable
security middleware for [Envelop](https://github.com/n1ru4l/envelop) servers.

## Usage

```bash
yarn --filter example-graphql-armor start
```

## Installation snippet

```typescript
import { EnvelopArmor } from '@escape.tech/graphql-armor'

const armor = new EnvelopArmor()
const enhancements = armor.protect()

const server = createServer({
  plugins: [...enhancements.plugins],
  ...
```

## Supported remediations

- Aliases Limit
- Character Limit
- Cost Limit
- Depth Limit
- Directives Limit
- Disabled Field Suggestion

## Example

**Example: Field Suggestion disabled**

A valid query is:

```bash
$ curl --location --request POST 'http://localhost:4000/graphql' \
  --header 'Content-Type: application/json' \
  --data-raw '{"query":"query { books { title } }"}'

{"data":{"books":[{"title":"The Awakening"},{"title":"City of Glass"}]}}
```

But if you try to use the field `title[e]`, you will get an error, the suggestion will be disabled
by GraphQL Armor:

```bash
$ curl --location --request POST 'http://localhost:4000/graphql' \
  --header 'Content-Type: application/json' \
  --data-raw '{"query":"query { books { titlee } }"}'

{"data":null,"errors":[{"message":"Cannot query field \"titlee\" on type \"Book\". [Suggestion message hidden by GraphQLArmor]?","locations":[{"line":1,"column":17}],"extensions":{}}]}
```

## To go further

You can read more about GraphQL Armor usage
[here](https://github.com/Escape-Technologies/graphql-armor)
