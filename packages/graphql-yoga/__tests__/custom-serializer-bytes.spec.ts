import type { Plugin } from '../src/plugins/types';
import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

const encoder = new TextEncoder();
const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
    }
  `,
});

function withSerializer(
  stringify: (result: unknown) => string | Uint8Array,
  opts: { batching?: boolean } = {},
) {
  const plugin: Plugin = {
    onExecute({ setExecuteFn }) {
      setExecuteFn((async () => ({ data: { hello: 'plain' }, stringify })) as never);
    },
  };
  return createYoga({ schema, plugins: [plugin], batching: opts.batching });
}

const post = (yoga: ReturnType<typeof createYoga>, body: unknown, accept?: string) =>
  yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accept ? { accept } : {}) },
    body: JSON.stringify(body),
  });

describe('bytes serializer', () => {
  const json = JSON.stringify({ data: { hello: 'héllo 世界 𝄞' } });
  const bytes = encoder.encode(json);

  it('single result: body bytes identical, content-length is the byte length', async () => {
    const yoga = withSerializer(() => bytes);
    const res = await post(yoga, { query: '{ hello }' });
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(res.headers.get('content-length')).toBe(String(bytes.byteLength));
    expect(bytes.byteLength).toBeGreaterThan(json.length);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it('single result: string serializer is unchanged', async () => {
    const yoga = withSerializer(() => json);
    const res = await post(yoga, { query: '{ hello }' });
    expect(res.headers.get('content-length')).toBe(String(bytes.byteLength));
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it('batched: bytes and string serializers mix into a valid JSON array', async () => {
    let call = 0;
    const yoga = withSerializer(
      () => (call++ % 2 === 0 ? bytes : JSON.stringify({ data: { hello: 'plain' } })),
      { batching: true },
    );
    const res = await post(yoga, [{ query: '{ hello }' }, { query: '{ hello }' }]);
    expect(await res.json()).toEqual([
      { data: { hello: 'héllo 世界 𝄞' } },
      { data: { hello: 'plain' } },
    ]);
  });

  it('batched: a result without a serializer next to a bytes one', async () => {
    let call = 0;
    const plugin: Plugin = {
      onExecute({ setExecuteFn }) {
        setExecuteFn((async () =>
          call++ === 0
            ? { data: { hello: 'plain' } }
            : { data: {}, stringify: () => bytes }) as never);
      },
    };
    const yoga = createYoga({ schema, plugins: [plugin], batching: true });
    const res = await post(yoga, [{ query: '{ hello }' }, { query: '{ hello }' }]);
    expect(await res.json()).toEqual([
      { data: { hello: 'plain' } },
      { data: { hello: 'héllo 世界 𝄞' } },
    ]);
  });

  it('event-stream: data line carries the JSON text', async () => {
    const yoga = withSerializer(() => bytes);
    const res = await post(yoga, { query: '{ hello }' }, 'text/event-stream');
    const text = await res.text();
    expect(text).toContain(`event: next\ndata: ${json}\n\n`);
  });

  it('multipart: chunk bytes are not re-encoded and length matches', async () => {
    const yoga = withSerializer(() => bytes);
    const res = await post(yoga, { query: '{ hello }' }, 'multipart/mixed');
    const text = await res.text();
    expect(text).toContain(`Content-Length: ${bytes.byteLength}`);
    expect(text).toContain(json);
  });
});
