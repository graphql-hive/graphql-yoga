/* eslint-disable no-console */
import fastify from 'fastify';
import { execute, parse, subscribe, validate } from 'graphql';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  sendResult,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const sleep = (t = 1000) => new Promise(resolve => setTimeout(resolve, t));

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
      greetings: [String!]
      me: User!
    }

    type User {
      id: ID!
      name: String!
      friends: [User!]!
      bio: String!
    }

    type Subscription {
      clock: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'World',
      greetings: async function* () {
        for (const greeting of ['hi', 'ho', 'sup', 'ola', 'bonjour']) {
          yield greeting;
          await sleep();
        }
      },
      me: () => ({ id: '1', name: 'Vanja' }),
    },
    User: {
      bio: async () => {
        await sleep(1500);
        return 'I like turtles';
      },
      friends: async function* () {
        for (const user of [
          { id: '2', name: 'Angela' },
          { id: '3', name: 'Christopher' },
          { id: '4', name: 'Titiana' },
          { id: '5', name: 'Leonard' },
          { id: '6', name: 'Ernesto' },
        ]) {
          yield user;
          await sleep(1000);
        }
      },
    },
    Subscription: {
      clock: {
        subscribe: async function* () {
          while (true) {
            yield { clock: new Date().toString() };
            await sleep();
          }
        },
      },
    },
  },
});

const graphiQLContent = /* GraphQL */ `
  ##
  ## Welcome to the envelop graphql-helix demo.
  ##
  ## We prepared some operations for you to try out :)
  ##

  # Basic query, nothing fancy here :)
  query BasicQuery {
    hello
  }

  # Query using stream
  #
  # stream can be used on fields that return lists.
  # The resolver on the backend uses an async generator function for yielding the values.
  # In this demo there is a sleep of one second before the next value is yielded.
  #
  # stream is useful in scenarios where a lot of items must be sent to the client, but you want to show something as soon as possible
  # e.g. a social media feed.
  #
  # The initialCount argument specifies the amount of items sent within the initial chunk.
  query StreamQuery {
    greetings @stream(initialCount: 1)
  }

  # Query using defer
  #
  # defer can be used on fragments in order to defer sending the result to the client, if it takes longer than the rest of the resolvers to yield an value.
  # The User.bio resolver on the backend uses a sleep of 2 seconds for deferring the resolution of the value.
  # Stream is useful when a certain resolver on your backend is slow, but not mandatory for showing something meaningful to your users.
  # An example for this would be a slow database call or third-party service.
  query DeferQuery {
    me {
      id
      name
      ... on User @defer {
        bio
      }
    }
  }

  # Query using both stream and defer
  #
  # Both directives can be used on the same operation!
  query MixedStreamAndDefer {
    me {
      id
      name
      ... on User @defer {
        bio
      }
      friends @stream(initialCount: 1) {
        id
        name
      }
    }
  }

  # Basic Subscription
  #
  # A subscription is a persistent connection between the graphql client and server and can be used for pushing events to the client.
  #
  # This subscription publishes the current date string every second.
  # Subscriptions are similar to defer and stream implemented via async generators.
  # Any event source such as Redis PubSub or MQTT  can be wrapped in an async generator and used for backing the subscription.
  # The published event value is then passed on to the execution algorithm similar to mutations and subscriptions.
  subscription BasicSubscription {
    clock
  }
`;

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});
const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped({
      req,
    });
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html');
      res.send(
        renderGraphiQL({
          defaultQuery: graphiQLContent
            .split('\n')
            .slice(1)
            .map(line => line.replace('  ', ''))
            .join('\n'),
        }),
      );
    } else {
      const request = {
        body: req.body,
        headers: req.headers,
        method: req.method,
        query: req.query,
      };
      const { operationName, query, variables } = getGraphQLParameters(request);
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      });

      sendResult(result, res.raw);

      // Tell fastify a response was sent
      res.sent = true;
    }
  },
});

app.listen(3000, () => {
  console.log(`GraphQL server is running on http://127.0.0.1:3000/graphql`);
});
