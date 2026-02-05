# error masking

This directory contains a simple GraphQL error masking example based on `graphql-yoga`.

## Get started

**Clone the repository:**

```sh
git clone https://github.com/graphcool/graphql-yoga.git
cd graphql-yoga/examples/error-masking
```

**Install dependencies and run the app:**

```sh
yarn install # or npm install
yarn start   # or npm start
```

## Testing

### Mask unexpected errors

Open your browser at [http://localhost:4000](http://localhost:4000).

Paste the following operation in the editor (left side) of GraphiQL:

```graphql
query {
  greeting
}
```

Press the Play (Execute Query) button.

The execution result should be identical with the following JSON response.

**Execution Result with masked error message**

```json
{
  "errors": [
    {
      "message": "Unexpected error.",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["greeting"]
    }
  ],
  "data": null
}
```

### Expose expected errors

Open your browser at [http://localhost:4000](http://localhost:4000).

Paste the following operation in the editor (left side) of GraphiQL:

```graphql
query {
  user(byId: "6") {
    id
  }
}
```

Press the Play (Execute Query) button.

The execution result should be identical with the following JSON response.

**Execution Result with expected error message**

```json
{
  "errors": [
    {
      "message": "User with id '6' not found.",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["user"],
      "extensions": {
        "code": "USER_NOT_FOUND",
        "someRandomExtensions": {
          "aaaa": 3
        }
      }
    }
  ],
  "data": null
}
```
