---
'graphql-yoga': minor
---

Support changing `graphqlEndpoint` after initialization;

```ts
const yoga = createYoga({
  schema,
  logging: false,
  plugins: [
    {
      onYogaInit({ yoga }) {
        // Inside the plugin
        yoga.graphqlEndpoint = `/(graphql|my-custom-path)`;
      },
    },
  ],
});

// Or after the initialization
yoga.graphqlEndpoint = `/(graphql|my-custom-path)`;
```
