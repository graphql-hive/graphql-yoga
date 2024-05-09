---
'graphql-yoga': patch
---

Do not allow reserved context keys in UserContext and ServerContext if they don't match

For example, you cannot have `request` as a key in UserContext or ServerContext unless it is `Request` like below;
```ts
// @ts-expect-error Not allowed
createYoga<{
    request: FastifyRequest
}>(/* ... */);

// But allowed
createYoga<{
    req: FastifyRequest
}>(/* ... */);

// Also allowed
createYoga<{
    request: Request // From Fetch API
}>(/* ... */);
```
