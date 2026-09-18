import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('Multipart', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello(name: String): String
      }
    `,
    resolvers: {
      Query: {
        hello: (_, { name }) => `hello ${name ?? 'Stranger'}!`,
      },
    },
  });
  const yoga = createYoga({
    schema,
  });

  // These cases assert Object.prototype directly, rather than only inferring
  // safety from a follow-up request succeeding.
  async function attemptPollution(mapPath: string) {
    const form = new FormData();
    form.set('operations', JSON.stringify({ query: '{ hello }', variables: {} }));
    form.set('map', JSON.stringify({ 0: [mapPath] }));
    form.set('0', 'x');
    return yoga.fetch('http://yoga/graphql', { method: 'POST', body: form });
  }

  // Guards the denylist that blocks these exact segment names outright.
  it.each([
    ['leading __proto__ segment', '__proto__.polluted'],
    ['__proto__ in the middle of the path', 'variables.__proto__.polluted'],
    ['constructor.prototype chain', 'variables.constructor.prototype.polluted'],
    ['prototype as a bare segment', 'variables.prototype.polluted'],
  ])('should not pollute Object.prototype via %s', async (_label, mapPath) => {
    const response = await attemptPollution(mapPath);

    expect(response.status).toBe(200);
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  // Traversing into ANY inherited (non-own)
  // property is blocked, not just the denylisted __proto__/constructor/prototype
  // names. `hasOwnProperty`/`toString`/`valueOf` aren't denylisted, so these would
  // still get through the denylist alone -- they only pass because of the
  // `Object.hasOwn(current, key) && isObject` check.
  it.each([
    ['hasOwnProperty.call', 'variables.hasOwnProperty.call'],
    ['toString.call', 'variables.toString.call'],
    ['valueOf.call', 'variables.valueOf.call'],
  ])('should not clobber builtin prototype methods via %s', async (_label, mapPath) => {
    await attemptPollution(mapPath);

    expect(typeof Object.prototype.hasOwnProperty).toBe('function');
    expect(typeof Object.prototype.hasOwnProperty.call).toBe('function');
    expect(typeof Object.prototype.toString.call).toBe('function');
    expect(typeof Object.prototype.valueOf.call).toBe('function');
  });

  it('should return 400 for malformed multipart data instead of a generic 500', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        // missing the required `boundary` parameter
        'Content-Type': 'multipart/form-data',
      },
      body: 'operations={"query":"{ hello }"}',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      errors: [{ message: expect.stringContaining('POST body sent invalid multipart data') }],
    });
  });
});
