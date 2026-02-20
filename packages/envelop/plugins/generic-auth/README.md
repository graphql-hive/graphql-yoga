## `@envelop/generic-auth`

This plugin allows you to implement custom authentication flow by providing a custom user resolver
based on the original HTTP request. The resolved user is injected into the GraphQL execution
`context`, and you can use it in your resolvers to fetch the current user.

> The plugin also comes with an optional `@authenticated` directive that can be added to your
> GraphQL schema and helps you to protect your GraphQL schema in a declarative way.

There are several possible flows for using this plugin (see below for setup examples):

- **Option #1 - Complete Protection**: protected the entire GraphQL schema from unauthenticated
  access. Allow unauthenticated access for certain fields by annotating them with a `@skipAuth`
  directive or `skipAuth` field extension.
- **Option #2 - Manual Validation**: the plugin will just resolve the user and injects it into the
  `context` without validating access to schema field.
- **Option #3 - Granular field access by using schema field directives or field extensions**: Look
  for an `@authenticated` directive or `authenticated` extension field and automatically protect
  those specific GraphQL fields.

## Getting Started

Start by installing the plugin:

```
yarn add @envelop/generic-auth
```

Then, define your authentication methods:

1. Resolve your user from the request by implementing `resolveUserFn`:

Use this method to only extract the user from the context, with any custom code, for example:

```ts
import { ResolveUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}

const resolveUserFn: ResolveUserFn<UserType> = async context => {
  // Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
  // to find the current user.
  // Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
  // Make sure to either return `null` or the user object.

  try {
    const user = await context.authApi.authenticateUser(context.req.headers.authorization)

    return user
  } catch (e) {
    console.error('Failed to validate token')

    return null
  }
}
```

2. Define an optional validation method by implementing `validateUser`:

This method is optional; the default method will just verify the value returned by `resolveUser` and
throw an error in case of a false value (`false | null | undefined`).

```ts
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = params => {
  // Here you can implement any custom to check if the user is valid and have access to the server.
  // This method is being triggered in different flows, based on the mode you chose to implement.

  // If you are using the `protect-auth-directive` mode, you'll also get 2 additional parameters: the resolver parameters as object and the DirectiveNode of the auth directive.
  // In `protect-auth-directive` mode, this function will always get called and you can use these parameters to check if the field has the `@authenticated` or `@skipAuth` directive

  if (!user) {
    return new Error(`Unauthenticated!`)
  }
}
```

Now, configure your plugin based on the mode you wish to use:

#### Option #1 - `protect-all`

This mode offers complete protection for the entire API. It protects your entire GraphQL schema by
validating the user before executing the request. You can optionally skip auth validation for
specific GraphQL fields by using the `@skipAuth` directive.

To setup this mode, use the following config:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { ResolveUserFn, useGenericAuth, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'protect-all'
    })
  ]
})
```

##### Allow unauthenticated access for specific fields using a field `directive`

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL
> schema (`directive @skipAuth on FIELD_DEFINITION`).

Then, in your GraphQL schema SDL, you can add `@skipAuth` directive to your fields, and the default
`validateUser` function will not get called while resolving that specific field:

```graphql
type Query {
  me: User!
  protectedField: String
  publicField: String @skipAuth
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

> If you are using a different directive for authentication, you can pass `authDirectiveName`
> configuration to customize it.

##### Allow unauthenticated access for specific fields using a field extension

```typescript
import { GraphQLInt, GraphQLObjectType } from 'graphql'

const GraphQLQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLInt,
      resolve: () => 1,
      extensions: {
        directives: {
          skipAuth: true
        }
      }
    }
  }
})
```

> If you want to use a different directive for authentication, you can use the `authDirectiveName`
> configuration to customize it.

#### Option #2 - `resolve-only`

This mode uses the plugin to inject the authenticated user into the `context`, and later you can
verify it in your resolvers.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { ResolveUserFn, useGenericAuth, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'resolve-only'
    })
  ]
})
```

Then, in your resolvers, you can execute the check method based on your needs:

```ts
const resolvers = {
  Query: {
    me: async (root, args, context) => {
      const validationError = context.validateUser()
      if (validationError) {
        throw validationError
      }

      const currentUser = context.currentUser

      return currentUser
    }
  }
}
```

#### Option #3 - `protect-granular`

This mode is similar to option #2, but it uses the `@authenticated` SDL directive or `auth` field
extension for protecting specific GraphQL fields.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { ResolveUserFn, useGenericAuth, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'protect-granular'
    })
  ]
})
```

##### Protect a field using a field or type `directive`

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL
> schema (`directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE`).

Then, in your GraphQL schema SDL, you can add `@authenticated` directive to your fields, and the
`validateUser` will get called only while resolving that specific field:

```graphql
type Query {
  me: User! @authenticated
  protectedField: String @authenticated
  # publicField: String
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

> If you are using a different directive for authentication, you can pass `authDirectiveName`
> configuration to customize it.

##### Protect a field or type using extensions

```typescript
import { GraphQLInt, GraphQLObjectType } from 'graphql'

const GraphQLQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLInt,
      resolve: () => 1,
      extensions: {
        directives: {
          authenticated: true
        }
      }
    }
  }
})
```

> If you are using a different field extension for authentication, you can pass `authDirectiveName`
> configuration to customize it.

#### Extend authentication with custom logic

You can also specify a custom `validateUser` function and get access to a handy object while using
the `protect-all` and `protect-granular` mode:

```ts
import { GraphQLError } from 'graphql'
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = ({ user }) => {
  // Now you can use the 3rd parameter to implement custom logic for user validation, with access
  // to the resolver data and information.

  if (!user) {
    return new GraphQLError(`Unauthenticated.`)
  }
}
```

##### Role/scope based authentication with `@requiresScope` directive

You can use `@requiresScope` directive to protect your schema based on the user's role or scope.
Here's an example of how you can use it:

```graphql
directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE

type Query {
  me: User! @requiresScopes(scopes: [["read:user"]])
  protectedField: String @requiresScopes(scopes: [["read:admin"]])
  publicField: String
}
```

By default, the plugin will try to extract available scopes for the current user from `scope`
property which is expected to be a string like `read:user read:admin`. However you can customize
this behavior by providing a custom `extractScopes` function.

```ts
useGenericAuth({
  resolveUserFn,
  validateUser,
  mode: 'protect-granular',
  extractScopes: user => user.scopes // Expected to return an array of strings
})
```

You can also apply `AND` or `OR` logic to the scopes:

```graphql
type Query {
  # This field requires the user to have `read:user` OR `read:admin` scopes
  me: User! @requiresScopes(scopes: [["read:user"], ["read:admin"]])
  # This field requires the user to have `read:user` AND `read:admin` scopes
  protectedField: String @requiresScopes(scopes: [["read:admin", "read:user"]])
  publicField: String
}
```

##### `@policy` directive to fetch the roles from a policy service

You can use the `@policy` directive to fetch the roles from a policy service. Here's an example of
how you can use it:

```graphql
directive @policy(name: String!) on FIELD_DEFINITION | OBJECT | INTERFACE

type Query {
  me: User! @policy(policies: [["read:user"]])
  protectedField: String @policy(policies: [["read:admin"]])
  publicField: String
}
```

It has the same logic with `@requiresScopes` but it can asynchronously fetch the roles from a
source;

```ts
useGenericAuth({
  resolveUserFn,
  validateUser,
  mode: 'protect-granular',
  fetchPolicies: async user => {
    const res = await fetch('https://policy-service.com', {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    })
    // Expected to return an array of strings
    return res.json()
  }
})
```

##### Reject the whole operation if the user is not authenticated for the entire selection set

By default, the plugin will reject the whole operation if the user is not authenticated for the
selection set fully. But if you want to allow partial execution, you can set `rejectUnauthorized` to
`false`.

When `rejectUnauthorized` is set to `false`, the plugin will behave like below;

```graphql
query {
  me {
    # This field will not be executed if the user is not authenticated
    id
    name
    email
  }
  protectedField # This field will not be executed if the user is not authenticated
  publicField # This field will be executed even if the user is not authenticated
}
```

##### With a custom field extensions

You can use custom field extension to pass data to your `validateUser` function instead of using a
directive. Here's an example for adding role-aware authentication:

```ts
const resolvers = {
  Query: {
    user: {
      me: (_, __, { currentUser }) => currentUser,
      extensions: {
        directives: {
          requiresScopes: {
            scopes: [['read:user']]
          }
        }
      }
    }
  }
}
```

##### With a custom validation function per field

You can also have access to operation variables and context via the `executionArgs` parameter. This
can be useful in conjunction with the `fieldAuthExtension` parameter to achieve custom per field
validation.

```ts
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = ({ user, executionArgs, fieldAuthExtension }) => {
  if (!user) {
    return new Error(`Unauthenticated!`)
  }

  // You have access to the object define in the resolver tree, allowing to define any custom logic you want.
  const validate = fieldAuthExtension?.validate
  if (validate) {
    return validate({
      user,
      variables: executionArgs.variableValues,
      context: executionArgs.contextValue
    })
  }
}

const resolvers = {
  Query: {
    user: {
      resolve: (_, { userId }) => getUser(userId),
      extensions: {
        directives: {
          authenticated: {
            validate: ({ user, variables, context }) => {
              // We can now have access to the operation and variables to decide if the user can execute the query
              if (user.id !== variables.userId) {
                return new Error(`Unauthorized`)
              }
            }
          }
        }
      }
    }
  }
}
```
