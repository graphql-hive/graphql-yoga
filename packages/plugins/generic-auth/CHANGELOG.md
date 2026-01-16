# @envelop/generic-auth

## 11.0.0

### Patch Changes

- Updated dependencies
  [[`0434fbd`](https://github.com/graphql-hive/envelop/commit/0434fbdf9e6a33a64f5cb5fe34662ea4815647eb)]:
  - @envelop/core@5.4.0
  - @envelop/extended-validation@7.0.0

## 10.0.1

### Patch Changes

- [#2742](https://github.com/graphql-hive/envelop/pull/2742)
  [`62a8915`](https://github.com/graphql-hive/envelop/commit/62a891547ee2e24185e2c9c0362a5168784be300)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Remove empty and unused nodes from redacted
  query after validation

- Updated dependencies
  [[`62a8915`](https://github.com/graphql-hive/envelop/commit/62a891547ee2e24185e2c9c0362a5168784be300)]:
  - @envelop/extended-validation@6.1.0

## 10.0.0

### Patch Changes

- Updated dependencies
  [[`3ebaa3b`](https://github.com/graphql-hive/envelop/commit/3ebaa3b75b34f9a61aa517166f538796b383bfad)]:
  - @envelop/core@5.3.0
  - @envelop/extended-validation@6.0.0

## 9.1.3

### Patch Changes

- Updated dependencies
  [[`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e),
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)]:
  - @envelop/core@5.2.3
  - @envelop/extended-validation@5.1.3

## 9.1.2

### Patch Changes

- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/core@5.2.2
  - @envelop/extended-validation@5.1.2

## 9.1.1

### Patch Changes

- [#2473](https://github.com/n1ru4l/envelop/pull/2473)
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.2.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.1)
    (to `dependencies`)

- [#2473](https://github.com/n1ru4l/envelop/pull/2473)
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)
  Thanks [@renovate](https://github.com/apps/renovate)! - Use Promise helpers

- Updated dependencies
  [[`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15),
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)]:
  - @envelop/core@5.2.1
  - @envelop/extended-validation@5.1.1

## 9.1.0

### Patch Changes

- Updated dependencies
  [[`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54),
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)]:
  - @envelop/core@5.2.0
  - @envelop/extended-validation@5.1.0

## 9.0.1

### Patch Changes

- Updated dependencies
  [[`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)]:
  - @envelop/core@5.1.1
  - @envelop/extended-validation@5.0.1

## 9.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/core@5.1.0
  - @envelop/extended-validation@5.0.0

## 8.0.1

### Patch Changes

- [#2347](https://github.com/n1ru4l/envelop/pull/2347)
  [`8b7e657`](https://github.com/n1ru4l/envelop/commit/8b7e657997cff286db145502d6d86cf7bc956cd0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/executor@^1.3.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.6)
    (to `dependencies`)

- [#2347](https://github.com/n1ru4l/envelop/pull/2347)
  [`8b7e657`](https://github.com/n1ru4l/envelop/commit/8b7e657997cff286db145502d6d86cf7bc956cd0)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle operations with \`@include\` and \`@skip\`
  correctly when they have default values in the operation definition

  ```ts
  {
      query: /* GraphQL */ `
        query MyQuery($include: Boolean = true) {
          field @include(if: $include)
        }
      `,
      variables: {}
  }
  ```

  should be considered same as

  ```ts
  {
      query: /* GraphQL */ `
        query MyQuery($include: Boolean!) {
          field @include(if: $include)
        }
      `,
      variables: {
          include: true
      }
  }
  ```

## 8.0.0

### Major Changes

- [#2281](https://github.com/n1ru4l/envelop/pull/2281)
  [`70d4d7a`](https://github.com/n1ru4l/envelop/commit/70d4d7a1fc359315e50704e52f96d98ba1506575)
  Thanks [@UserType;](https://github.com/UserType;)! - Refactor Generic Auth plugin;
  - [BREAKING] - Now `@auth` directive is renamed to `@authenticated`. If you want to keep the old
    name you can configure the plugin to use the old name.

  ```ts
  useGenericAuth({
    // ...
    authDirectiveName: 'auth'
  })
  ```

  - [BREAKING] - Now `directiveOrExtensionFieldName` is renamed to `authDirectiveName`.

  ```diff
  useGenericAuth({
    // ...
  - directiveOrExtensionFieldName: 'auth',
  + authDirectiveName: 'auth',
  });
  ```

  - Now auth directives support `OBJECT` and `INTERFACE` locations, so you can use the auth
    directive on types as well.

  ```graphql
  directive @authenticated on OBJECT | INTERFACE

  type User @authenticated {
    id: ID!
    name: String!
  }
  ```

  - `validateUser` function does not receive `fieldAuthDirectiveNode` and `fieldAuthExtension`
    anymore. Instead, it takes `fieldAuthArgs` which is an object that contains the arguments of the
    auth directive or extension. So you don't need to parse the arguments manually anymore.

  ```ts
  const validateUser: ValidateUserFn = params => {
    if (!params.fieldAuthArgs.roles.includes('admin')) {
      return createUnauthorizedError(params)
    }
  }
  ```

  - `validateUser`'s `objectType` parameter is now renamed to `parentType`. And it takes the
    original composite type instead of the `GraphQLObjectType` instance. Now it can be
    `GraphQLInterfaceType` as well.
  - `validateUser`'s current parameters are now;

  ```ts
  export type ValidateUserFnParams<UserType> = {
    /** The user object. */

    /** The field node from the operation that is being validated. */
    fieldNode: FieldNode
    /** The parent type which has the field that is being validated. */
    parentType: GraphQLObjectType | GraphQLInterfaceType
    /** The auth directive arguments for the type */
    typeAuthArgs?: Record<string, any>
    /** The directives for the type */
    typeDirectives?: ReturnType<typeof getDirectiveExtensions>
    /** Scopes that type requires */
    typeScopes?: string[][]
    /** Policies that type requires */
    typePolicies?: string[][]
    /** The object field */
    field: GraphQLField<any, any>
    /** The auth directive arguments for the field */
    fieldAuthArgs?: Record<string, any>
    /** The directives for the field */
    fieldDirectives?: ReturnType<typeof getDirectiveExtensions>
    /** Scopes that field requires */
    fieldScopes?: string[][]
    /** Policies that field requires */
    fieldPolicies?: string[][]
    /** Extracted scopes from the user object */
    userScopes: string[]
    /** Policies for the user */
    userPolicies: string[]
    /** The args passed to the execution function (including operation context and variables) **/
    executionArgs: ExecutionArgs
    /** Resolve path */
    path: ReadonlyArray<string | number>
  }
  ```

  - New directives for role-based auth are added `@requiresScopes` and `@policy` for more granular
    control over the auth logic.

  ```graphql
  directive @requiresScopes(scopes: [String!]!) on OBJECT | INTERFACE | FIELD_DEFINITION

  directive @policy(policy: String!) on OBJECT | INTERFACE | FIELD_DEFINITION
  ```

  Check README for more information.

### Patch Changes

- [#2281](https://github.com/n1ru4l/envelop/pull/2281)
  [`70d4d7a`](https://github.com/n1ru4l/envelop/commit/70d4d7a1fc359315e50704e52f96d98ba1506575)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.5.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.1)
    (from `^10.0.6`, in `dependencies`)
- Updated dependencies
  [[`70d4d7a`](https://github.com/n1ru4l/envelop/commit/70d4d7a1fc359315e50704e52f96d98ba1506575)]:
  - @envelop/extended-validation@4.1.0

## 7.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487),
  [`f7ef03c0`](https://github.com/n1ru4l/envelop/commit/f7ef03c07ae1af3abf08de86bc95fe626bbc7913)]:
  - @envelop/core@5.0.0

### Patch Changes

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)]:
  - @envelop/extended-validation@4.0.0

## 6.1.1

### Patch Changes

- [#1927](https://github.com/n1ru4l/envelop/pull/1927)
  [`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/extended-validation@^3.0.2` ↗︎](https://www.npmjs.com/package/@envelop/extended-validation/v/3.0.2)
    (from `^3.0.1`, in `dependencies`)
  - Updated dependency
    [`@envelop/core@^4.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.2) (from
    `^4.0.1`, in `peerDependencies`)

- Updated dependencies
  [[`dee6b8d2`](https://github.com/n1ru4l/envelop/commit/dee6b8d215f21301660090037b6685e86d217593)]:
  - @envelop/core@4.0.3
- Updated dependencies
  [[`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)]:
  - @envelop/extended-validation@3.0.3

## 6.1.0

### Minor Changes

- [#1950](https://github.com/n1ru4l/envelop/pull/1950)
  [`4e368f61`](https://github.com/n1ru4l/envelop/commit/4e368f611cf06332407ab35641619cfb9b0d65ff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Handle @skip and @include directive by
  skipping validation of this fields.

### Patch Changes

- [#1950](https://github.com/n1ru4l/envelop/pull/1950)
  [`4e368f61`](https://github.com/n1ru4l/envelop/commit/4e368f611cf06332407ab35641619cfb9b0d65ff)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Added dependency
    [`@graphql-tools/utils@^10.0.6` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.6)
    (to `dependencies`)

- Updated dependencies
  [[`db20864a`](https://github.com/n1ru4l/envelop/commit/db20864aac3fcede3e265ae63b2e8cb4664ba23a)]:
  - @envelop/core@4.0.2
- Updated dependencies []:
  - @envelop/extended-validation@3.0.2

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1
- Updated dependencies []:
  - @envelop/extended-validation@3.0.1

## 6.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- [#1755](https://github.com/n1ru4l/envelop/pull/1755)
  [`17afb252`](https://github.com/n1ru4l/envelop/commit/17afb2521294ea60213c6aed0d8095ae50112842)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix documentation to remove references
  to async `validateUser` and throwing to report errors

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)]:
  - @envelop/extended-validation@3.0.0

## 5.0.6

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6
- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/extended-validation@2.0.6

## 5.0.5

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5
- Updated dependencies []:
  - @envelop/extended-validation@2.0.5

## 5.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4
- Updated dependencies []:
  - @envelop/extended-validation@2.0.4

## 5.0.3

### Patch Changes

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3
- Updated dependencies []:
  - @envelop/extended-validation@2.0.3

## 5.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2
- Updated dependencies []:
  - @envelop/extended-validation@2.0.2

## 5.0.0

### Major Changes

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/core@3.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/extended-validation@2.0.0

## 4.6.0

### Minor Changes

- [#1528](https://github.com/n1ru4l/envelop/pull/1528)
  [`50f214a2`](https://github.com/n1ru4l/envelop/commit/50f214a26cb6595f8ef4dda43cd32dd28d7fc67d)
  Thanks [--](https://github.com/--)! - give access to execute args in `validateUser` function.

  This is useful in conjunction with the `fieldAuthExtension` parameter to achieve custom per field
  validation:

  ```ts
  import { ValidateUserFn } from '@envelop/generic-auth'

  const validateUser: ValidateUserFn<UserType> = async ({ user, executionArgs, fieldAuthExtension }) => {
    if (!user) {
      throw new Error(`Unauthenticated!`)
    }

    // You have access to the object define in the resolver tree, allowing to define any custom logic you want.
    const validate = fieldAuthExtension?.validate
    if (validate) {
      await validate({ user, variables: executionArgs.variableValues, context: executionArgs.contextValue })
    }
  }

  const resolvers = {
    Query: {

        resolve: (_, { userId }) => getUser(userId),
        extensions: {
          auth: {
            validate: ({ user, variables, context }) => {
              // We can now have access to the operation and variables to decide if the user can execute the query
              if (user.id !== variables.userId) {
                throw new Error(`Unauthorized`)
              }
            }
          }
        }
      }
    }
  }
  ```

## 4.5.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499)
  [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)
  Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency resolver, that
  requires that all dependencies are specified on package.json otherwise it would endue in an error
  if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently being used, tslib should
  be exported as a dependency to external runners get the proper import.

  Change on each package:

  ```json
  // package.json
  {
    "dependencies": {
      "tslib": "^2.4.0"
    }
  }
  ```

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6),
  [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a)]:
  - @envelop/core@2.6.0

### Patch Changes

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)]:
  - @envelop/extended-validation@1.9.0

## 4.4.0

### Minor Changes

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

### Patch Changes

- Updated dependencies []:
  - @envelop/extended-validation@1.8.0

## 4.3.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2
- Updated dependencies [071f946]
  - @envelop/extended-validation@1.7.2

## 4.3.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1
  - @envelop/extended-validation@1.7.1

## 4.3.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

### Patch Changes

- Updated dependencies [8bb2738]
  - @envelop/extended-validation@1.7.0

## 4.2.4

### Patch Changes

- ddd0e4f: `useGenericAuth`'s `ContextType` generic used to accept the types that has an index
  signature which makes it impossible to use it with "fixed types". Now it defaults to
  `DefaultContext` without extending it so any kind of type can be used as `ContextType`.

  Also `useGenericAuth` now takes a third generic which is the name of the field name that contains
  the user data in the context. It can be also inferred from `contextFieldName` of the plugin
  options.

## 4.2.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3
- Updated dependencies [fbf6155]
  - @envelop/extended-validation@1.6.3

## 4.2.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2
  - @envelop/extended-validation@1.6.2

## 4.2.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1
  - @envelop/extended-validation@1.6.1

## 4.2.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

### Patch Changes

- @envelop/extended-validation@1.6.0

## 4.1.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

### Patch Changes

- @envelop/extended-validation@1.5.0

## 4.0.1

### Patch Changes

- Updated dependencies [01c8dd6]
  - @envelop/extended-validation@1.4.1

## 4.0.0

### Major Changes

- 7f78839: Use the extended validation phase instead of resolver wrapping for applying
  authentication rules.

  `onResolverCalled` results in wrapping all resolvers in the schema and can be a severe performance
  bottle-neck.

  Now the authorization rules are applied statically before running any execution logic, which
  results in the WHOLE operation being rejected as soon as a field in the selection set does not
  have sufficient permissions.

  The mode `protect-auth-directive` has been renamed to `protect-granular`.

  The `authDirectiveName` option got renamed to `directiveOrExtensionFieldName`.

  Authorization rules for the `protect-all` and `protect-granular`, can be applied via field
  extensions:

  ```typescript
  // schema.ts
  import { GraphQLInt, GraphQLObjectType } from 'graphql'

  const GraphQLQueryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      foo: {
        type: GraphQLInt,
        resolve: () => 1,
        extensions: {
          skipAuth: true
          // or auth: true for mode "protect-granular".
        }
      }
    }
  })
  ```

  The `validateUser` function is no longer attached to the `context` object passed to the resolvers.
  You can add your own `validateUser` function to the context using `useExtendContext`.

  ```typescript
  const getEnveloped = envelop({
    plugins: [
      useSchema(schema),
      useGenericAuth(options),
      useExtendContext(() => ({ validateUser }))
    ]
  })
  ```

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

### Patch Changes

- Updated dependencies [78b3db2]
- Updated dependencies [8030244]
  - @envelop/extended-validation@1.4.0

## 3.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 1.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

### Patch Changes

- 9f63dac: Add `skipAuth` directive to `protect-all` auth option

## 1.0.1

### Patch Changes

- 546db6c: Fix issue with inaccessible directiveNode

## 1.0.1

### Patch Changes

- Fix issue with inaccessible directiveNode

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.2.0

### Minor Changes

- 83b2b92: Extend plugin errors from GraphQLError.

## 0.1.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.1.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

## 0.0.2

### Patch Changes

- 5fc65a4: Improved type-safety for internal context

## 0.0.1

### Patch Changes

- 55a13bd: NEW PLUGIN!
