import { createGraphQLError, createSchema, createYoga } from 'graphql-yoga';
import { Trace } from '@apollo/usage-reporting-protobuf';
import { useApolloInlineTrace } from '../src/index.js';

describe('Inline Trace', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
        boom: String!
        person: Person!
        people: [Person!]!
      }
      type Subscription {
        hello: String!
      }
      type Person {
        name: String!
      }
    `,
    resolvers: {
      Query: {
        async hello() {
          return 'world';
        },
        async boom() {
          throw new Error('bam');
        },
        async person() {
          return { name: 'John' };
        },
        async people() {
          return [{ name: 'John' }, { name: 'Jane' }];
        },
      },
      Subscription: {
        hello: {
          async *subscribe() {
            yield { hello: 'world' };
          },
        },
      },
    },
  });

  const yoga = createYoga({
    schema,
    plugins: [useApolloInlineTrace()],
    maskedErrors: false,
  });

  it('should add ftv1 tracing to result extensions', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            hello
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(response.ok).toBeTruthy();
    expect(result?.errors).toBeUndefined();
    expect(result?.extensions?.ftv1).toBeDefined();
  });

  function expectTrace(trace: Trace) {
    expect(trace.startTime).toBeDefined();
    expect(typeof trace.startTime?.seconds).toBe('number');
    expect(typeof trace.startTime?.nanos).toBe('number');

    expect(typeof trace.durationNs).toBe('number');

    expect(trace.endTime).toBeDefined();
    expect(typeof trace.endTime?.seconds).toBe('number');
    expect(typeof trace.endTime?.nanos).toBe('number');

    // its ok to be "equal" since executions can happen in the same tick
    expect(
      addSecondsAndNanos(trace.startTime!.seconds!, trace.startTime!.nanos!),
    ).toBeLessThanOrEqual(addSecondsAndNanos(trace.endTime!.seconds!, trace.endTime!.nanos!));

    expect(typeof trace.fieldExecutionWeight).toBe('number');

    expect(trace.root).toBeDefined();
    expect(trace.root?.child).toBeInstanceOf(Array);
  }

  function expectTraceNode(
    node: Trace.INode | null | undefined,
    field: string,
    type: string,
    parent: string,
  ) {
    expect(node).toBeDefined();

    expect(node!.responseName).toBe(field);
    expect(node!.type).toBe(type);
    expect(node!.parentType).toBe(parent);

    expect(typeof node!.startTime).toBe('number');
    expect(typeof node!.endTime).toBe('number');

    // its ok to be "equal" since executions can happen in the same tick
    expect(node!.startTime!).toBeLessThanOrEqual(node!.endTime!);
  }

  it('should have proto tracing on flat query', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            hello
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(response.ok).toBeTruthy();
    expect(result?.errors).toBeUndefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));
    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const hello = trace.root?.child?.[0];
    expect(hello?.error?.length).toBe(0);
    expectTraceNode(hello, 'hello', 'String!', 'Query');
  });

  it('should have proto tracing on aliased flat query', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            hi: hello
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(response.ok).toBeTruthy();
    expect(result?.errors).toBeUndefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const hi = trace.root?.child?.[0];
    expect(hi?.error?.length).toBe(0);
    expectTraceNode(hi, 'hi', 'String!', 'Query');
    expect(hi?.originalFieldName).toBe('hello');
  });

  it('should have proto tracing on flat query with array field', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            people {
              name
            }
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(response.ok).toBeTruthy();
    expect(result?.errors).toBeUndefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const people = trace.root?.child?.[0];
    expect(people?.error?.length).toBe(0);
    expectTraceNode(people, 'people', '[Person!]!', 'Query');

    const arr = people!.child!;
    for (let i = 0; i < arr.length; i++) {
      const person = arr[i];
      expect(person?.error?.length).toBe(0);
      expect(person!.index).toBe(i);
      expectTraceNode(person!.child?.[0], 'name', 'String!', 'Person');
    }
  });

  it('should have proto tracing on nested query', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            person {
              name
            }
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result?.errors).toBeUndefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const person = trace.root?.child?.[0];
    expect(person?.error?.length).toBe(0);
    expectTraceNode(person, 'person', 'Person!', 'Query');

    const personName = person?.child?.[0];
    expect(personName?.error?.length).toBe(0);
    expectTraceNode(personName, 'name', 'String!', 'Person');
  });

  function expectTraceNodeError(node: Trace.INode | null | undefined) {
    expect(node).toBeDefined();
    expect(node!.error).toBeDefined();
    const error = node!.error!;
    expect(error).toBeInstanceOf(Array);
    expect(error.length).toBeGreaterThan(0);
    expect(typeof error[0]!.message).toBe('string');
    expect(typeof error[0]!.location).toBeDefined();
    expect(typeof error[0]!.location?.[0]?.line).toBe('number');
    expect(typeof error[0]!.location?.[0]?.column).toBe('number');
    expect(() => {
      JSON.parse(error[0]!.json!);
    }).not.toThrow();
  }

  it('should have proto tracing on parse fail', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: '{ he',
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(result?.errors).toBeDefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    expect(ftv1).toBeDefined();
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));
    expectTrace(trace);
    expectTraceNodeError(trace.root);
  });

  it('should have proto tracing on validation fail', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            henlo
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(result?.errors).toBeDefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    expect(ftv1).toBeDefined();
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expectTraceNodeError(trace.root);
  });

  it('should have proto tracing on execution fail', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            boom
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(result?.errors).toBeDefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    expect(ftv1).toBeDefined();
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const boom = trace.root?.child?.[0];
    expectTraceNode(boom, 'boom', 'String!', 'Query');
    expectTraceNodeError(boom);
  });

  it('should skip tracing errors through rewriteError', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useApolloInlineTrace({
          rewriteError: () => null,
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: '{ he',
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(result?.errors).toBeDefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    expect(ftv1).toBeDefined();
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);
  });

  it('should rewrite only error messages and extensions through rewriteError', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useApolloInlineTrace({
          rewriteError: () => createGraphQLError('bim', { extensions: { str: 'ing' } }),
        }),
      ],
      logging: false,
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            boom
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result = await response.json();

    expect(result?.errors).toBeDefined();

    //

    const ftv1 = result?.extensions?.ftv1;
    expect(ftv1).toBeDefined();
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const boom = trace.root?.child?.[0];
    expectTraceNode(boom, 'boom', 'String!', 'Query');
    expectTraceNodeError(boom); // will check for location

    const error = boom!.error!;
    expect(error[0]?.message).toBe('bim'); // not 'bam'

    const errObj = JSON.parse(error[0]!.json!);
    expect(errObj.extensions).toEqual({ str: 'ing' });
  });

  it('should not trace subscriptions', async () => {
    const response = await yoga.fetch(
      'http://yoga/graphql?query=' + encodeURIComponent('subscription{hello}'),
      {
        headers: {
          Accept: 'text/event-stream',
        },
      },
    );

    expect(response.ok).toBe(true);

    const result = await response.text();
    expect(result).toContain('data: {"data":{"hello":"world"}}\n\n');
  });
});

function addSecondsAndNanos(seconds: number, nanos: number): number {
  return seconds + nanos / 1e9;
}
