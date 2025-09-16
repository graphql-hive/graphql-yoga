import path from 'node:path';
import { createYoga, YogaServerInstance } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';
import { DbDrop, MigrateDev } from '@prisma/migrate';
import type { GraphQLContext } from '../src/context';
import { schema } from '../src/schema';

describe('hackernews example integration', () => {
  let yoga: YogaServerInstance<GraphQLContext, GraphQLContext>;
  beforeAll(async () => {
    const { createContext } = await import('../src/context');
    yoga = createYoga({ schema, context: createContext });

    // migrate
    await MigrateDev.new().parse(
      [`--schema=${path.resolve(__dirname, '..', 'prisma', 'schema.prisma')}`],
      {},
    );

    // seed
    const client = new PrismaClient();
    await client.link.create({
      data: {
        url: 'https://www.prisma.io',
        description: 'Prisma replaces traditional ORMs',
      },
    });
    await client.$disconnect();
  });

  afterAll(async () => {
    // drop
    await DbDrop.new().parse(
      [
        `--schema=${path.resolve(__dirname, '..', 'prisma', 'schema.prisma')}`,
        '--preview-feature', // DbDrop is an experimental feature
        '--force',
      ],
      {},
    );
  });

  it('should get posts from feed', async () => {
    const response = await yoga.fetch('http://yoga/graphql?query={feed{url,description}}');

    const body = await response.json();
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "feed": [
            {
              "description": "Prisma replaces traditional ORMs",
              "url": "https://www.prisma.io",
            },
          ],
        },
      }
    `);
  });

  it('should create a new post', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation createPost {
            postLink(
              url: "https://www.the-guild.dev/graphql/yoga-server"
              description: "Time to Relax with GraphQL Yoga"
            ) {
              url
              description
            }
          }
        `,
      }),
    });

    const body = await response.json();
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "postLink": {
            "description": "Time to Relax with GraphQL Yoga",
            "url": "https://www.the-guild.dev/graphql/yoga-server",
          },
        },
      }
    `);
  });

  it('should create a new comment on post', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateComment {
            postCommentOnLink(body: "Comment on post", linkId: "1") {
              body
              link {
                description
                id
                url
              }
            }
          }
        `,
      }),
    });

    const body = await response.json();
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "postCommentOnLink": {
            "body": "Comment on post",
            "link": {
              "description": "Prisma replaces traditional ORMs",
              "id": "1",
              "url": "https://www.prisma.io",
            },
          },
        },
      }
    `);
  });
});
