import { versionInfo } from 'graphql';
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

    expect(body.errors).toHaveLength(1);
    if (versionInfo.major >= 17) {
      expect(body.errors.at(0)).toMatchObject({
        extensions: {
          code: 'GRAPHQL_VALIDATION_FAILED',
        },
        message: 'Cannot query field "titlee" on type "Book".',
      });
    } else {
      expect(body.errors.at(0)).toMatchObject({
        extensions: {
          code: 'GRAPHQL_VALIDATION_FAILED',
        },
        message: 'Cannot query field "titlee" on type "Book". [Suggestion hidden]',
      });
    }

    expect(body.data).toBeFalsy();
  });
});
