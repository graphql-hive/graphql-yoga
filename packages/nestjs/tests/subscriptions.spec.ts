import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { AppModule } from './fixtures/graphql/app.module';

let app: INestApplication, url: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule.forRoot()],
  }).compile();
  app = module.createNestApplication();
  await app.listen(0);
  url = (await app.getUrl()) + '/graphql';
});

afterAll(() => app.close());

it('should subscribe using sse', async () => {
  const sub = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        subscription {
          greetings
        }
      `,
    }),
  });

  await expect(sub.text()).resolves.toMatchInlineSnapshot(`
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

it("should execute Nest Subscription decorator's filter function on each emitted value", async () => {
  const sub = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        subscription {
          filteredGreetings(firstLetter: "H")
        }
      `,
    }),
  });

  await expect(sub.text()).resolves.toMatchInlineSnapshot(`
":

event: next
data: {"data":{"filteredGreetings":"Hi"}}

event: next
data: {"data":{"filteredGreetings":"Hola"}}

event: complete
data:

"
`);
});
