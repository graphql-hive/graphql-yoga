---
'graphql-yoga': minor
---

Short-circuit response in `onRequestParse` hook

In the `onRequestParse` hook, if a response is sent using `endResponse`, we should short-circuit the request parsing and return that response immediately. This allows users to handle certain requests entirely within the `onRequestParse` hook without needing to go through the rest of the request processing pipeline.

```ts
const plugin = {
  onRequestParse({ endResponse }) {
    if (/* some condition */) {
      endResponse(new Response('Short-circuited response'));
    }
  },
};
```

Or you can also short-circuit the response inside the request parser:

```ts
const plugin = {
  onRequestParse({ setRequestParser }) {
    setRequestParser(req => {
        if (req.url === '/short-circuit') {
          return new Response('Short-circuited response');
        }
        // Otherwise, return the parsed parameters as usual
        return parseRequestNormally(req);
    });
  },
};
```