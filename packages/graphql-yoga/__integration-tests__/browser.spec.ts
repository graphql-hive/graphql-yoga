import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { GraphQLLiveDirective, useLiveQuery } from '@envelop/live-query';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import 'json-bigint-patch';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
// @see https://github.com/graphql-hive/graphql-yoga/pull/3543#issuecomment-2537035739
// eslint-disable-next-line
import { Browser, chromium, ElementHandle, Page } from 'playwright';
import { fakePromise } from '@whatwg-node/server';
import {
  ansiCodes,
  CORSOptions,
  createSchema,
  createYoga,
  GraphiQLOptions,
  Repeater,
} from '../src/index.js';

let resolveOnReturn: VoidFunction;
const timeoutsSignal = new AbortController();

let charCode = 'A'.charCodeAt(0);
const fakeAsyncIterable = {
  [Symbol.asyncIterator]() {
    return this;
  },
  next: () =>
    setTimeout$(
      300,
      {
        value: String.fromCharCode(charCode++),
        done: false,
      },
      {
        signal: timeoutsSignal.signal,
      },
    ),
  return: () => {
    resolveOnReturn();
    timeoutsSignal.abort();
    return fakePromise({ done: true });
  },
};

// will be registered inside `emitter` resolver
let emitToEmitter: ((val: string) => Promise<unknown>) | null;
let stopEmitter: (() => void) | null;

export function createTestSchema() {
  let liveQueryCounter = 0;

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        alwaysFalse: {
          type: GraphQLBoolean,
          resolve: () => false,
        },
        alwaysTrue: {
          type: GraphQLBoolean,
          resolve: () => true,
        },
        echo: {
          args: {
            text: {
              type: GraphQLString,
            },
          },
          type: GraphQLString,
          resolve: (_root, args) => args['text'],
        },
        hello: {
          type: GraphQLString,
          resolve: () => 'hello',
        },
        goodbye: {
          type: GraphQLString,
          resolve: () => setTimeout$(1000, 'goodbye'),
        },
        stream: {
          type: new GraphQLList(GraphQLString),
          resolve: () => fakeAsyncIterable,
        },
        bigint: {
          type: GraphQLBigInt,
          resolve: () => BigInt('112345667891012345'),
        },
        liveCounter: {
          type: GraphQLInt,
          resolve: () => {
            liveQueryCounter++;
            return liveQueryCounter;
          },
        },
        deprecatedField: {
          type: GraphQLString,
          deprecationReason: 'This is deprecated',
          args: {
            deprecatedArg: {
              type: new GraphQLInputObjectType({
                name: 'DeprecatedInput',
                fields: {
                  deprecatedInputField: {
                    type: GraphQLString,
                    deprecationReason: 'This is deprecated',
                  },
                },
              }),
              deprecationReason: 'This is deprecated',
            },
          },
          resolve: (_root, args) => args['deprecatedArg']['deprecatedInputField'],
        },
      }),
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: () => ({
        setFavoriteNumber: {
          args: {
            number: {
              type: GraphQLInt,
            },
          },
          type: GraphQLInt,
          resolve: (_root, args) => {
            return args['number'];
          },
        },
      }),
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: () => ({
        counter: {
          type: GraphQLInt,
          subscribe: () =>
            new Repeater((push, end) => {
              let counter = 0;
              const send = () => push(counter++);
              const interval = setInterval(() => send(), 1000);
              end.then(() => clearInterval(interval));
            }),
          resolve: value => value,
        },
        countdown: {
          type: new GraphQLNonNull(GraphQLInt),
          args: {
            from: {
              type: new GraphQLNonNull(GraphQLInt),
            },
          },
          subscribe: (_, { from }) =>
            new Repeater((push, end) => {
              let counter = from;
              const send = () => {
                push(counter);
                if (counter === 0) {
                  end();
                }

                counter--;
              };
              const interval = setInterval(() => send(), 1000);
              end.then(() => clearInterval(interval));
            }),
          resolve: value => value,
        },
        error: {
          type: GraphQLBoolean,
          // eslint-disable-next-line require-yield
          async *subscribe() {
            throw new Error('This is not okay');
          },
        },
        eventEmitted: {
          type: GraphQLFloat,
          async *subscribe() {
            yield { eventEmitted: Date.now() };
          },
        },
        emitter: {
          type: new GraphQLNonNull(GraphQLString),
          subscribe() {
            return new Repeater(async (push, stop) => {
              emitToEmitter = val => push({ emitter: val });
              stopEmitter = stop;
              await stop;
              emitToEmitter = null;
              stopEmitter = null;
            });
          },
        },
        count: {
          type: GraphQLInt,
          args: {
            to: {
              type: new GraphQLNonNull(GraphQLInt),
            },
          },
          async *subscribe(_root, args) {
            for (let count = 1; count <= args['to']; count++) {
              yield { count };
              await setTimeout$(200);
            }
          },
        },
      }),
    }),
    directives: [GraphQLLiveDirective],
  });
}

jest.setTimeout(60_000);

describe('browser', () => {
  const liveQueryStore = new InMemoryLiveQueryStore();
  const endpoint = '/test-graphql';
  let cors: CORSOptions = {};
  let graphiqlOptions: GraphiQLOptions | undefined;
  const yogaApp = createYoga({
    schema: createTestSchema(),
    cors: () => cors,
    graphiql: () => graphiqlOptions || true,
    logging: false,
    graphqlEndpoint: endpoint,
    plugins: [
      useLiveQuery({
        liveQueryStore,
      }),
      useDeferStream(),
    ],
    renderGraphiQL,
  });

  let browser: Browser;
  let page: Page;

  const playButtonSelector = `[aria-label^="Execute"]`;
  const stopButtonSelector = `[aria-label^="Stop"]`;

  let port: number;
  const server = createServer(yogaApp);

  function wrapColor(msg: string, color?: string) {
    if (color != null && color in ansiCodes) {
      return `${ansiCodes[color as keyof typeof ansiCodes]}${msg}${ansiCodes.reset}`;
    }
    return msg;
  }

  beforeAll(async () => {
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
    browser = await chromium.launch({
      headless: process.env['PLAYWRIGHT_HEADLESS'] !== 'false',
      args: ['--incognito', '--no-sandbox', '--disable-setuid-sandbox'],
      // eslint-disable-next-line unicorn/no-negated-condition, no-extra-boolean-cast
      logger: !!process.env['DEBUG']
        ? {
            isEnabled(_name: string) {
              return true;
            },
            log(name, severity, message, args, hints) {
              if (severity === 'error') {
                // eslint-disable-next-line no-console
                console.error(wrapColor(`[${name}] ${message}`, hints.color), ...args);
              } else {
                // eslint-disable-next-line no-console
                console.log(wrapColor(`[${name}] ${message}`), ...args);
              }
            },
          }
        : undefined,
    });
  });
  beforeEach(async () => {
    if (page !== undefined) {
      await page.close();
    }
    const context = await browser.newContext();
    const pages = await context.pages();
    page = pages[0] || (await context.newPage());
  });
  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }),
    );
  });

  const typeOperationText = async (text: string) => {
    await page.type('[data-uri*="operation"] textarea', text, { delay: 300 });
    // TODO: figure out how we can avoid this wait
    // it is very likely that there is a delay from textarea -> react state update
    await setTimeout$(300);
  };

  const typeVariablesText = async (text: string) => {
    await page.type('[data-uri*="variables"] textarea', text, { delay: 100 });
    // TODO: figure out how we can avoid this wait
    // it is very likely that there is a delay from textarea -> react state update
    await setTimeout$(100);
  };

  const waitForResult = async (): Promise<object> => {
    await page.waitForSelector('[data-uri*="response"] textarea');
    await page.waitForFunction(
      // @ts-expect-error - value is not null
      () => !!window.document.querySelector('[data-uri*="response"] textarea')?.value?.trim(),
    );
    const resultContents = await page.evaluate(() => {
      return (
        window.document
          .querySelector('[data-uri*="response"] textarea')
          // @ts-expect-error - value is not null
          ?.value?.trim()
          .replaceAll('\u00A0', ' ')
      );
    });

    return JSON.parse(resultContents!);
  };

  const showGraphiQLSidebar = async () => {
    // Click to show sidebar
    await page.click('[aria-label="Show Documentation Explorer"]');
  };

  const getElementText = async (element: ElementHandle<Element>) =>
    element.evaluate(el => el.textContent?.trim());

  describe('GraphiQL', () => {
    it('should show default title', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);

      const title = await page.evaluate(() => document.title);

      expect(title).toBe('Yoga GraphiQL');
    });

    it('should show default schema docs', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);

      // Click to show sidebar
      await showGraphiQLSidebar();

      const docsElement$ = page.waitForSelector('.graphiql-markdown-description');

      await expect(docsElement$).resolves.not.toBeNull();
      await expect(docsElement$.then(docsElement => getElementText(docsElement!))).resolves.toBe(
        'A GraphQL schema provides a root type for each kind of operation.',
      );
    });

    it('should show editor tools by default', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);

      // If this button is visible, that mean editor tools is showing
      const buttonHideEditor = await page.$('button[aria-label="Hide editor tools"]');

      const editorTabs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.graphiql-editor-tools button'), e => e.textContent),
      );

      expect(buttonHideEditor).not.toBeNull();
      expect(editorTabs).toContain('Variables');
      expect(editorTabs).toContain('Headers');
    });

    it('execute simple query operation', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);
      await typeOperationText('{ alwaysTrue }');

      await page.click(playButtonSelector);
      await expect(waitForResult()).resolves.toEqual({
        data: {
          alwaysTrue: true,
        },
      });
    });

    it('execute mutation operation', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);
      await typeOperationText(`mutation ($number: Int!) { setFavoriteNumber(number: $number) }`);
      await typeVariablesText(`{ "number": 3 }`);
      await page.click('.graphiql-execute-button');
      await expect(waitForResult()).resolves.toEqual({
        data: {
          setFavoriteNumber: 3,
        },
      });
    });

    test('execute @stream operation', async () => {
      await page.goto(`http://localhost:${port}${endpoint}?query={ stream @stream }`);
      const returnPromise$ = new Promise<void>(resolve => {
        resolveOnReturn = resolve;
      });
      await page.click('.graphiql-execute-button');
      await setTimeout$(900);
      function isShowingStopButton() {
        return page.evaluate(stopButtonSelector => {
          return !!window.document.querySelector(stopButtonSelector);
        }, stopButtonSelector);
      }
      await expect(isShowingStopButton()).resolves.toBe(true);
      await expect(waitForResult()).resolves.toEqual({
        data: {
          stream: ['A', 'B', 'C'],
        },
      });
      await page.click(stopButtonSelector);
      await returnPromise$;
      await expect(isShowingStopButton()).resolves.toEqual(false);
    });

    test('execute SSE (subscription) operation', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);
      await typeOperationText(`subscription { emitter }`);
      await page.click('.graphiql-execute-button');

      // showing stop selector means subscription has started
      await page.waitForSelector(stopButtonSelector);

      await emitToEmitter!('one');

      await expect(waitForResult()).resolves.toEqual({
        data: {
          emitter: 'one',
        },
      });

      await emitToEmitter!('two');

      await expect(waitForResult()).resolves.toEqual({
        data: {
          emitter: 'two',
        },
      });

      stopEmitter!();

      // wait for subscription to end
      await page.waitForSelector(playButtonSelector);
    });

    test('show the query provided in the search param', async () => {
      const query = '{ alwaysTrue }';
      await page.goto(`http://localhost:${port}${endpoint}?query=${encodeURIComponent(query)}`);
      await page.click('.graphiql-execute-button');
      await expect(waitForResult()).resolves.toEqual({
        data: {
          alwaysTrue: true,
        },
      });
    });

    test('should show BigInt correctly', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);
      await typeOperationText(`{ bigint }`);
      await page.click('.graphiql-execute-button');

      await expect(waitForResult()).resolves.toMatchObject({
        data: {
          bigint: BigInt('112345667891012345'),
        },
      });
    });
    test('should show live queries correctly', async () => {
      await page.goto(`http://localhost:${port}${endpoint}`);
      await typeOperationText(`query @live { liveCounter }`);
      await page.click('.graphiql-execute-button');

      await setTimeout$(50);

      await expect(waitForResult()).resolves.toEqual({
        data: {
          liveCounter: 1,
        },
        isLive: true,
      });
      liveQueryStore.invalidate('Query.liveCounter');

      await page.waitForFunction(() => {
        const value = window.document
          .querySelector('[data-uri*="response"] textarea')
          // @ts-expect-error - value is not null
          ?.value?.trim()
          .replaceAll('\u00A0', ' ');

        return value?.includes('2');
      });

      await expect(waitForResult()).resolves.toEqual({
        data: {
          liveCounter: 2,
        },
        isLive: true,
      });
    });
  });

  describe('GraphiQL with custom options', () => {
    let customGraphQLEndpoint: string;

    const schemaWithDescription = createTestSchema();
    schemaWithDescription.description = 'Here is the custom docs for schema';

    const defaultHeader = '{"Authorization":"Bearer test-auth-header"}';
    const customServer = createServer(
      createYoga({
        schema: schemaWithDescription,
        logging: false,
        graphqlEndpoint: endpoint,
        graphiql: {
          title: 'GraphiQL Custom title here',
          headers: defaultHeader,
        },
        renderGraphiQL,
      }),
    );

    beforeAll(async () => {
      await new Promise<void>(resolve => customServer.listen(0, resolve));
      const port = (customServer.address() as AddressInfo).port;
      customGraphQLEndpoint = `http://localhost:${port}${endpoint}`;
    });

    afterAll(async () => {
      await new Promise(resolve => customServer.close(resolve));
    });

    it('should show custom title', async () => {
      await page.goto(customGraphQLEndpoint);

      return expect(page.evaluate(() => document.title)).resolves.toBe(
        'GraphiQL Custom title here',
      );
    });

    it('should show custom schema docs', async () => {
      await page.goto(customGraphQLEndpoint);

      await showGraphiQLSidebar();
      const docsElement$ = page.waitForSelector('.graphiql-markdown-description');

      await expect(docsElement$).resolves.not.toBeNull();
      await expect(docsElement$.then(docsElement => getElementText(docsElement!))).resolves.toBe(
        schemaWithDescription.description,
      );
    });

    it('should include default header', async () => {
      await page.goto(customGraphQLEndpoint);
      await page.click('[data-name="headers"]');
      await page.click('[data-uri*="headers"]');
      const headerValue = await page.inputValue('[data-uri*="headers"] textarea');
      expect(headerValue).toBe(defaultHeader);
    });

    it('supports input value deprecations', async () => {
      await page.goto(customGraphQLEndpoint);
      await page.click('.graphiql-un-styled[data-index="0"]');
      await page.click('a.graphiql-doc-explorer-type-name');
      await page.getByText('Show Deprecated Fields').click();
      const deprecatedField = page.getByText('deprecatedField');
      expect(await deprecatedField.count()).toBe(1);
      await deprecatedField.click();
      expect(await page.getByText('deprecatedArg').count()).toBe(1);
      expect(await page.getByText('DeprecatedInput').count()).toBe(1);
      await page.getByText('DeprecatedInput').click();
      expect(await page.getByText('deprecatedInputField').count()).toBe(1);
    });
  });

  describe('CORS', () => {
    let anotherServer: Server;
    let anotherOriginPort: number;
    beforeAll(async () => {
      anotherServer = createServer((_req, res) => {
        res.end(/* HTML */ `
          <html>
            <head>
              <title>Another Origin</title>
            </head>
            <body>
              <h1>Another Origin</h1>
              <p id="result">RESULT_HERE</p>
              <script>
                async function fetchData() {
                  try {
                    const response = await fetch('http://localhost:${port}${endpoint}', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        query: '{ alwaysTrue }',
                      }),
                    });
                    document.getElementById('result').innerHTML = await response.text();
                  } catch (e) {
                    document.getElementById('result').innerHTML = e.stack;
                  }
                }
                fetchData();
              </script>
            </body>
          </html>
        `);
      });
      await new Promise<void>(resolve => anotherServer.listen(0, () => resolve()));
      anotherOriginPort = (anotherServer.address() as AddressInfo).port;
    });
    afterAll(async () => {
      await new Promise<void>(resolve => anotherServer.close(() => resolve()));
    });
    test('allow other origins by default', async () => {
      await page.goto(`http://localhost:${anotherOriginPort}`);
      const result = await page.evaluate(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return document.getElementById('result')?.innerHTML;
      });
      expect(result).toEqual(
        JSON.stringify({
          data: {
            alwaysTrue: true,
          },
        }),
      );
    });
    test('allow if specified', async () => {
      cors = {
        origin: [`http://localhost:${anotherOriginPort}`],
      };
      await page.goto(`http://localhost:${anotherOriginPort}`);
      await expect(
        page.evaluate(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return document.getElementById('result')?.innerHTML;
        }),
      ).resolves.toEqual(
        JSON.stringify({
          data: {
            alwaysTrue: true,
          },
        }),
      );
    });
    test('restrict other origins if provided', async () => {
      cors = {
        origin: ['http://localhost:${port}'],
      };
      await page.goto(`http://localhost:${anotherOriginPort}`);
      await expect(
        page.evaluate(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return document.getElementById('result')?.innerHTML;
        }),
      ).resolves.toContain('Failed to fetch');
    });
    test('send specific origin back to user if credentials are set true', async () => {
      cors = {
        origin: [`http://localhost:${anotherOriginPort}`],
        credentials: true,
      };
      await page.goto(`http://localhost:${anotherOriginPort}`);
      await expect(
        page.evaluate(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return document.getElementById('result')?.innerHTML;
        }),
      ).resolves.toEqual(
        JSON.stringify({
          data: {
            alwaysTrue: true,
          },
        }),
      );
    });
  });

  describe('EventSource', () => {
    test('subscription operation', async () => {
      await page.goto(`http://localhost:${port}/`);

      const result = await page.evaluate(urlStr => {
        const url = new URL(urlStr);
        url.searchParams.set(
          'query',
          /* GraphQL */ `
            subscription {
              countdown(from: 1)
            }
          `,
        );
        const source = new EventSource(url.toString());

        return new Promise<
          { error: string; data?: never } | { error?: never; data: Array<string> }
        >(res => {
          const values: Array<string> = [];
          source.addEventListener('next', event => {
            values.push(event.data);
          });
          source.addEventListener('complete', () => {
            source.close();
            res({ data: values });
          });
          source.onerror = err => {
            res({ error: String(err) });
          };
        });
      }, `http://localhost:${port}${endpoint}`);

      if (result.error) {
        throw new Error(result.error);
      }

      expect(result.data).toMatchInlineSnapshot(`
        [
          "{"data":{"countdown":1}}",
          "{"data":{"countdown":0}}",
        ]
      `);
    });
  });

  let anotherServer: Server;
  afterAll(async () => {
    if (anotherServer) {
      await new Promise<void>((resolve, reject) =>
        anotherServer.close(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }),
      );
    }
  });
  test('`endpoint` configures GraphiQL to point another server', async () => {
    const anotherYoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            greetings: String!
          }
        `,
        resolvers: {
          Query: {
            greetings: () => 'Hello from another server',
          },
        },
      }),
    });
    anotherServer = createServer(anotherYoga);
    await new Promise<void>(resolve => anotherServer.listen(0, resolve));
    const anotherPort = (anotherServer.address() as AddressInfo).port;
    const anotherEndpoint = `http://localhost:${anotherPort}/graphql`;
    graphiqlOptions = {
      endpoint: anotherEndpoint,
    };
    await page.goto(`http://localhost:${port}${endpoint}`);
    await typeOperationText('{ greetings }');
    await page.click(playButtonSelector);
    await expect(waitForResult()).resolves.toEqual({
      data: {
        greetings: 'Hello from another server',
      },
    });
  });
});
