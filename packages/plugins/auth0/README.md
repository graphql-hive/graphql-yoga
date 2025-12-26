## `@envelop/auth0`

This plugin validates an JWT token created by [Auth0](https://auth0.com/), and injects the Auth0
user properties into your GraphQL context. With this plugin, you can implement authentication and
authorization in a simple way.

> The plugins is using [JWKS](https://auth0.com/docs/tokens/json-web-tokens/json-web-key-sets)
> standard in order to validate the token.

## Getting Started

We recommend using the
[Adding Authentication with Auth0 guide](https://www.envelop.dev/docs/guides/adding-authentication-with-auth0)
if this is your first time using this plugin!

1. Sign up for [Auth0](https://auth0.com/), create a tenant based on your needs, and then create an
   Auth0 Application (https://auth0.com/docs/applications).
2. Setup Auth0 client based on your client app. You should be able to login on your app, and get a
   JWT token from Auth0. Make sure to pass that token in your GraphQL requests sent to your server,
   using headers (for example: `Authorization: Bearer XYZ`). You can find more info here:
   https://auth0.com/docs/quickstart/spa
3. From your tenant configuration screen, find your `audience` and `domain` configurations.
4. Setup Envelop with that plugin:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { useAuth0 } from '@envelop/auth0'
import { envelop, useEngine } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useAuth0({
      onError: e => {}, // In case of an error, you can override it and customize the error your client will get.
      domain: 'YOUR_AUTH0_DOMAIN_HERE',
      audience: 'YOUR_AUTH0_AUDIENCE_HERE',
      headerName: 'authorization', // Name of the header
      preventUnauthenticatedAccess: true, // If you need to have unauthenticated parts on your schema, make sure to disable that by setting it to `false` and the check it in your resolvers.
      extendContextField: 'auth0', // The name of the field injected to your `context`
      tokenType: 'Bearer' // Type of token to expect in the header
    })
  ]
})
```

5. Make sure to pass your request as part of the context building:

```ts
myHttpServer.on('request', async req => {
  const { contextFactory } = getEnveloped({ req })
  const contextValue = await contextFactory({ req }) // Make sure to pass it here
})
```

> By default, this plugins looks for `req` or `request` properties in your base context. If you need
> to override it, please use `extractTokenFn` and you can customize it.

6. You should now be able to validate user tokens, and if a user is valid, you can get the Auth0
   user id (called `sub`) as part of your `context` during execution:

```ts
const myResolvers = {
  Query: {
    me: (root, args, context, info) => {
      const auth0UserId = context.auth0.sub
    }
  }
}
```

### API Reference

#### `jwksClientOptions`

Pass this to customize the JWKS client creation. See: https://github.com/auth0/node-jwks-rsa

> Setting this will override any other options defined by this plugin.

#### `jwtDecodeOptions`

Pass this to customize the JWT `decode` phase. See:
https://www.npmjs.com/package/jws#jwsdecodesignature

#### `jwtVerifyOptions`

Pass this to customize the JWT `verify` phase. See:
https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback

#### `onError(e: Error)`

By default, this library will throw an error during context building if an error has happened.

If you wish to customize the error, you can add `onError` callback and throw a custom error based on
your needs.

#### `preventUnauthenticatedAccess`

By default, this library will prevent execution flow and throw an error in case of an authentication
error.

Setting this to `false` will lead to a `null` value in case of authentication issue (and `onError`
will still get called).

#### `domain`

Specifies the Auth0 domain, please note that you need to specify that field with a protocol, for
example: `my-domain.us.auth0.com`

#### `audience`

Specifies the Auth0 audience.

#### `extractTokenFn(context: any)`

If you wish to customize the token extraction from your HTTP request, override this function. It
gets the `context` built so far as an argument, and you can extract your auth token based on your
setup.

#### `headerName` + `tokenType`

If `extractTokenFn` is not set, the default behavior of this plugin is to look for `req` and
`request` in the context, then look for `headers` and look for `authentication` header (you can
customize it with `headerName`). Then, it validates that the token is of type `Bearer` (you can
customize it with `tokenType` option).

#### `extendContextField`

The name of the field to inject to your `context`. When the user is valid, the decoded and verified
payload of the JWT is injected. In most cases, the field that you need is `sub` (which refers to the
internal Auth0 user identifier).

You can read more about the token structure here:
https://auth0.com/docs/tokens/json-web-tokens/json-web-token-structure

By default, the `auth0` value is used.

## Notes

> Make sure to specify `audience` field in the client, otherwise you'll get an opaque token instead
> of a JWT token.
