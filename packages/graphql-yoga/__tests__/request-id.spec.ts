import { createSchema, createYoga, Logger, MemoryLogWriter } from '../src';

const schema = createSchema<{ log: Logger }>({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello(_source, _args, context) {
        context.log.info('resolving hello');
        return 'world';
      },
    },
  },
});

function createTestYoga(options?: Parameters<typeof createYoga>[0]) {
  const writer = new MemoryLogWriter();
  const yoga = createYoga({
    schema,
    logging: new Logger({ level: 'debug', writers: [writer] }),
    ...options,
  });
  return { yoga, writer };
}

async function query(yoga: ReturnType<typeof createYoga>, headers: HeadersInit = {}) {
  return yoga.fetch('http://yoga/graphql?query={hello}', {
    headers: { accept: 'application/graphql-response+json', ...headers },
  });
}

describe('request id', () => {
  it('generates a request id and sets it on the response', async () => {
    const { yoga } = createTestYoga();

    const response = await query(yoga);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toEqual(expect.any(String));
  });

  it('reuses the request id of the incoming request', async () => {
    const { yoga, writer } = createTestYoga();

    const response = await query(yoga, { 'x-request-id': 'my-request-id' });

    expect(response.headers.get('x-request-id')).toBe('my-request-id');
    expect(writer.logs).toContainEqual(
      expect.objectContaining({
        msg: 'resolving hello',
        attrs: { requestId: 'my-request-id' },
      }),
    );
  });

  it('falls back to a generated id for an empty header', async () => {
    const { yoga } = createTestYoga();

    const response = await query(yoga, { 'x-request-id': '' });

    expect(response.headers.get('x-request-id')).toEqual(expect.any(String));
  });

  it('ignores an unusable request id from the incoming request', async () => {
    const { yoga } = createTestYoga();

    const response = await query(yoga, {
      // a request id is embedded verbatim into every log line of the request, so control
      // characters (used for log injection) must not make it through
      'x-request-id': 'injected\nlog line',
    });

    expect(response.headers.get('x-request-id')).not.toBe('injected\nlog line');
    expect(response.headers.get('x-request-id')).toEqual(expect.any(String));
  });

  it('correlates every log line of a request under the same id', async () => {
    const { yoga, writer } = createTestYoga();

    await query(yoga, { 'x-request-id': 'first' });
    await query(yoga, { 'x-request-id': 'second' });

    const requestIds = new Set(
      writer.logs.map(log => (log.attrs as { requestId?: string } | undefined)?.requestId),
    );
    expect(requestIds).toEqual(new Set(['first', 'second']));
  });

  it('can be configured', async () => {
    const { yoga, writer } = createTestYoga({
      schema,
      requestId: {
        headerName: 'x-correlation-id',
        generateRequestId: () => 'generated-id',
      },
    });

    const response = await query(yoga);

    expect(response.headers.get('x-request-id')).toBeNull();
    expect(response.headers.get('x-correlation-id')).toBe('generated-id');
    expect(writer.logs).toContainEqual(
      expect.objectContaining({
        msg: 'resolving hello',
        attrs: { requestId: 'generated-id' },
      }),
    );
  });

  it('can be disabled', async () => {
    const { yoga, writer } = createTestYoga({ schema, requestId: false });

    const response = await query(yoga);

    expect(response.headers.get('x-request-id')).toBeNull();
    // no `requestId` attribute is attached to the logs of the request
    expect(writer.logs).toContainEqual({ level: 'info', msg: 'resolving hello' });
  });
});
