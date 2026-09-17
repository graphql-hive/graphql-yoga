---
'graphql-yoga': patch
---

Fixes the issue thrown in the plugin that limits the incoming request body's size,
when the incoming `Request` object is not the instance of the `fetchAPI.Request` which is usually the ponyfill implementation from `@whatwg-node/node-fetch`.

This will be fixed in the following breaking release in `@whatwg-node/node-fetch` but in order to unblock the current users of GraphQL Yoga, a small normalization layer has been added to the plugin as a temporary workaround.

Since the native `Request.body` is a native `ReadableStream`, that doesn't support other `TransformStream` implementation to its `pipeThrough` method, the limiting implementation didn't work properly.

When the user ran Yoga within Next.js that uses the native `Request` object, it threw a `TypeError` which causes a cryptic `500 Internal Server Error` for Next.js users.

This workaround checks whether the incoming `Request`'s body object is an instance of the native `ReadableStream` and applies the appropriate `TransformStream` implementation to ensure the request body size limiting works correctly.
