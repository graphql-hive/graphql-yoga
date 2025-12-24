## `@envelop/extended-validation`

Extended validation plugin adds support for writing GraphQL validation rules, that has access to all
`execute` parameters, including variables.

While GraphQL supports fair amount of built-in validations, and validations could be extended, it's
doesn't expose `variables` to the validation rules, since operation variables are not available
during `validate` flow (it's only available through execution of the operation, after
input/variables coercion is done).

This plugin runs before `validate` but allow developers to write their validation rules in the same
way GraphQL `ValidationRule` is defined (based on a GraphQL visitor).

## Getting Started

Start by installing the plugin:

```
yarn add @envelop/extended-validation
```

Then, use the plugin with your validation rules:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useExtendedValidation } from '@envelop/extended-validation'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useExtendedValidation({
      rules: [
        /* ... your rules here  */
      ]
    })
  ]
})
```

To create your custom rules, implement the `ExtendedValidationRule` interface and return your
GraphQL AST visitor.

For example:

```ts
import { ExtendedValidationRule } from '@envelop/extended-validation'

export const MyRule: ExtendedValidationRule = (validationContext, executionArgs) => {
  return {
    OperationDefinition: node => {
      // This will run for every executed Query/Mutation/Subscription
      // And now you also have access to the execution params like variables, context and so on.
      // If you wish to report an error, use validationContext.reportError or throw an exception.
    }
  }
}
```

## Built-in Rules

### Union Inputs: `@oneOf`

This directive provides validation for input types and implements the concept of union inputs. You
can find the [complete spec RFC here](https://github.com/graphql/graphql-spec/pull/825).

You can use union inputs either via a the SDL flow, by annotating types and fields with `@oneOf` or
via the `extensions` field.

First, make sure to add that rule to your plugin usage:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { OneOfInputObjectsRule, useExtendedValidation } from '@envelop/extended-validation'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useExtendedValidation({
      rules: [OneOfInputObjectsRule]
    })
  ]
})
```

#### Schema Directive Flow

Make sure to include the following directive in your schema:

```graphql
directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
```

Then, apply it to field definitions, or to a complete `input` type:

```graphql
## Apply to entire input type
input FindUserInput @oneOf {
  id: ID
  organizationAndRegistrationNumber: GraphQLInt
}

## Or, apply to a set of input arguments

type Query {
  foo(id: ID, str1: String, str2: String): String @oneOf
}
```

#### Programmatic extensions flow

```tsx
const GraphQLFindUserInput = new GraphQLInputObjectType({
  name: 'FindUserInput',
  fields: {
    id: {
      type: GraphQLID
    },
    organizationAndRegistrationNumber: {
      type: GraphQLInt
    }
  },
  extensions: {
    oneOf: true
  }
})

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLString,
      args: {
        id: {
          type: GraphQLID
        },
        str1: {
          type: GraphQLString
        },
        str2: {
          type: GraphQLString
        }
      },
      extensions: {
        oneOf: true
      }
    }
  }
})
```
