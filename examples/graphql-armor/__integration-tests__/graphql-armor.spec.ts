import { yoga } from '../src/yoga';

describe('graphql-auth example integration', () => {
  it('should execute valid query', async () => {
    const response = await yoga.fetch(`http://yoga/graphql?query=query{books{title}}`);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toMatchInlineSnapshot(`
      {
        "books": [
          {
            "title": "The Awakening",
          },
          {
            "title": "City of Glass",
          },
        ],
      }
    `);
  });

  it('should get error for field suggestion', async () => {
    const response = await yoga.fetch(`http://yoga/graphql?query=query{books{titlee}}`);
    const body = await response.json();
    expect(body.errors).toMatchInlineSnapshot(`
[
  {
    "extensions": {
      "code": "GRAPHQL_VALIDATION_FAILED",
    },
    "locations": [
      {
        "column": 13,
        "line": 1,
      },
    ],
    "message": "Cannot query field "titlee" on type "Book". [Suggestion hidden]",
  },
]
`);
    expect(body.data).toBeFalsy();
  });
});
