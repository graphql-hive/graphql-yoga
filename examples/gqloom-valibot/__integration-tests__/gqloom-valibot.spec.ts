import { yoga } from '../src/yoga';

describe('gqloom-valibot example integration', () => {
  it('should query', async () => {
    const response = await yoga.fetch('http://yoga/graphql?query={hello}');

    expect(response.status).toBe(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hello":"world"}}"`);
  });

  it('should subscribe', async () => {
    const response = await yoga.fetch('http://yoga/graphql?query=subscription{greetings}', {
      headers: {
        accept: 'text/event-stream',
      },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toMatchInlineSnapshot(`
":

event: next
data: {"data":{"greetings":"Hi"}}

event: next
data: {"data":{"greetings":"Bonjour"}}

event: next
data: {"data":{"greetings":"Hola"}}

event: next
data: {"data":{"greetings":"Ciao"}}

event: next
data: {"data":{"greetings":"Zdravo"}}

event: complete
data:

"
`);
  });
});
