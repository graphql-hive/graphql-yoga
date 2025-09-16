import { FormattedExecutionResult, GraphQLFormattedError, versionInfo } from 'graphql';
import { createYoga, YogaServerInstance } from 'graphql-yoga';
import { Trace } from '@apollo/usage-reporting-protobuf';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';
import { getStitchedSchemaFromLocalSchemas } from './fixtures/getStitchedSchemaFromLocalSchemas';
import { getSubgraph1Schema } from './fixtures/subgraph1';
import { getSubgraph2Schema } from './fixtures/subgraph2';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(versionInfo.major >= 16)('Inline Trace - Yoga gateway', () => {
  let yoga: YogaServerInstance<Record<string, unknown>, Record<string, unknown>>;

  beforeAll(async () => {
    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      subgraph1: await getSubgraph1Schema(),
      subgraph2: await getSubgraph2Schema(),
    });

    yoga = createYoga({
      schema: gatewaySchema,
      plugins: [useApolloInlineTrace()],
      maskedErrors: false,
    });
  });

  function expectTrace(trace: Trace) {
    const expectedTrace: Partial<Trace> = {
      root: {
        child: expect.any(Array),
      },
      startTime: {
        seconds: expect.any(Number),
        nanos: expect.any(Number),
      },
      endTime: {
        seconds: expect.any(Number),
        nanos: expect.any(Number),
      },
      durationNs: expect.any(Number),
      fieldExecutionWeight: expect.any(Number),
    };

    expect(trace).toMatchObject(expectedTrace);
    // its ok to be "equal" since executions can happen in the same tick
    expect(trace.startTime!.seconds).toBeLessThanOrEqual(trace.endTime!.seconds!);
    if (trace.startTime!.seconds === trace.endTime!.seconds) {
      expect(trace.startTime!.nanos).toBeLessThanOrEqual(trace.endTime!.nanos!);
    }
  }

  function expectTraceNode(
    node: Trace.INode,
    responseName: string,
    type: string,
    parentType: string,
  ) {
    const expectedTraceNode: Partial<Trace.INode> = {
      responseName,
      type,
      parentType,
      startTime: expect.any(Number),
      endTime: expect.any(Number),
    };

    expect(node).toMatchObject(expectedTraceNode);
    // its ok to be "equal" since executions can happen in the same tick
    expect(node.startTime).toBeLessThanOrEqual(node.endTime!);
  }

  it('nullableFail - multi federated query - should return result with expected data and errors', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          nullableFail {
            id
            email
            sub1
          }
          subgraph2 {
            id
            email
            sub2
          }
        }
      }
    `;

    const expectedData = {
      testNestedField: {
        nullableFail: null,
        subgraph2: {
          email: 'user2@example.com',
          id: 'user2',
          sub2: true,
        },
      },
    };

    const expectedErrors: GraphQLFormattedError[] = [
      {
        message: 'My original subgraph error!',
        path: ['testNestedField', 'nullableFail'],
      },
    ];

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'content-type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result: FormattedExecutionResult = await response.json();

    expect(response.status).toBe(200);
    expect(result.errors).toMatchObject(expectedErrors);
    expect(result.data).toMatchObject(expectedData);
    expect(result.extensions?.['ftv1']).toEqual(expect.any(String));

    const ftv1 = result.extensions?.['ftv1'] as string;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);

    const nullableFail = trace.root?.child?.[0]?.child?.[0] as Trace.INode;

    expectTraceNode(nullableFail, 'nullableFail', 'TestUser1', 'TestNestedField');

    expect(nullableFail.error).toHaveLength(1);
    expect(JSON.parse(nullableFail.error![0]!.json!)).toMatchObject(expectedErrors[0]!);
  });

  it('nullableFail - simple federated query - should return result with expected data and errors', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          nullableFail {
            id
            email
            sub1
          }
        }
      }
    `;

    const expectedData = {
      testNestedField: {
        nullableFail: null,
      },
    };

    const expectedErrors: GraphQLFormattedError[] = [
      {
        message: 'My original subgraph error!',
        path: ['testNestedField', 'nullableFail'],
      },
    ];

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'content-type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result: FormattedExecutionResult = await response.json();

    expect(response.status).toBe(200);
    expect(result.errors).toMatchObject(expectedErrors);
    expect(result.data).toMatchObject(expectedData);
    expect(result.extensions?.['ftv1']).toEqual(expect.any(String));

    const ftv1 = result.extensions?.['ftv1'] as string;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);

    const nullableFail = trace.root?.child?.[0]?.child?.[0] as Trace.INode;

    expectTraceNode(nullableFail, 'nullableFail', 'TestUser1', 'TestNestedField');

    expect(nullableFail.error).toHaveLength(1);
    expect(JSON.parse(nullableFail.error![0]!.json!)).toMatchObject(expectedErrors[0]!);
  });

  it.skip('nonNullableFail - multi federated query - should return result with expected data and errors', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          nonNullableFail {
            id
            email
            sub1
          }
          subgraph2 {
            id
            email
            sub2
          }
        }
      }
    `;

    /**
     * The whole query result is { testNestedField: null } even if subgraph2 query not fail, but it should be ok according GraphQL documentation.
     * "If the field which experienced an error was declared as Non-Null, the null result will bubble up to the next nullable field."
     * https://spec.graphql.org/draft/#sel-GAPHRPTCAACEzBg6S
     */
    const expectedData = {
      testNestedField: null,
    };

    const expectedErrors: GraphQLFormattedError[] = [
      {
        message: 'My original subgraph error!',
        path: ['testNestedField', 'nonNullableFail'],
      },
    ];

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'content-type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result: FormattedExecutionResult = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toMatchObject(expectedData);
    expect(result.errors).toMatchObject(expectedErrors);
    expect(result.extensions?.['ftv1']).toEqual(expect.any(String));

    const ftv1 = result.extensions?.['ftv1'] as string;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);

    const nonNullableFail = trace.root?.child?.[0]?.child?.[0] as Trace.INode;

    expectTraceNode(nonNullableFail, 'nonNullableFail', 'TestUser1!', 'TestNestedField');

    expect(nonNullableFail.error).toHaveLength(1);
    expect(JSON.parse(nonNullableFail.error![0]!.json!)).toMatchObject(expectedErrors[0]!);
  });

  it('nonNullableFail - simple federated query - should return result with expected data and errors', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          nonNullableFail {
            id
            email
            sub1
          }
        }
      }
    `;

    const expectedData = {
      testNestedField: null,
    };

    const expectedErrors: GraphQLFormattedError[] = [
      {
        message: 'My original subgraph error!',
        path: ['testNestedField', 'nonNullableFail'],
      },
    ];

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'content-type': 'application/json',
        'apollo-federation-include-trace': 'ftv1',
      },
    });

    const result: FormattedExecutionResult = await response.json();

    expect(response.status).toBe(200);
    expect(result.errors).toMatchObject(expectedErrors);
    expect(result.data).toMatchObject(expectedData);
    expect(result.extensions?.['ftv1']).toEqual(expect.any(String));

    const ftv1 = result.extensions?.['ftv1'] as string;
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);

    /**
     * NOTE: nonNullableFail field is missing here in case of "simple federated query" where only one subgraph is called
     * therefore the error is assigned to the nearest possible trace node which is testNestedField in this case.
     */
    const testNestedField = trace.root?.child?.[0] as Trace.INode;

    expectTraceNode(testNestedField, 'testNestedField', 'TestNestedField', 'Query');

    expect(testNestedField.error).toHaveLength(1);
    expect(JSON.parse(testNestedField.error![0]!.json!)).toMatchObject(expectedErrors[0]!);
  });
});
