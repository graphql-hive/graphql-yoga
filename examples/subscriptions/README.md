# subscriptions

This directory contains a simple GraphQL subscriptions example based on `graphql-yoga`.

## Get started

**Clone the repository:**

```sh
git clone https://github.com/graphcool/graphql-yoga.git
cd graphql-yoga/examples/subscriptions
```

**Install dependencies and run the app:**

```sh
yarn install # or npm install
yarn start   # or npm start
```

## Testing

### Counter

Open your browser at [http://localhost:4000](http://localhost:4000).

Paste the following subscription in the editor (left side) of GraphiQL:

```graphql
subscription {
  counter
}
```

Press the Play (Execute Query) button.

The counter will increment every second and the corresponding data is received in the Playground:

```json
{
  "data": {
    "counter": 1,
  }
}
// ... 1 seconds
{
  "data": {
    "counter": 2,
  }
}
// ... 2 seconds
{
  "data": {
    "counter": 3,
  }
}
// ...
```

### Global counter

Open your browser at [http://localhost:4000](http://localhost:4000)n.

Paste the following subscription in the editor (left side) of GraphiQL:

```graphql
subscription {
  globalCounter
}
```

Press the Play (Execute Query) button.

You will receive this initial result:

```json
{
  "data": {
    "globalCounter": 0
  }
}
```

Open another browser window and execute the following mutation:

```graphql
mutation {
  incrementGlobalCounter
}
```

Press the Play (Execute Query) button.

You will receive this result:

```json
{
  "data": {
    "incrementGlobalCounter": 1
  }
}
```

On the other window that is executing the subscription, you will receive a new result.

```json
{
  "data": {
    "globalCounter": 1
  }
}
```

As you re-execute the mutation the global counter will be further incremented.
