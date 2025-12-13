import { createYoga } from 'graphql-yoga';
import * as v from 'valibot';
import { query, resolver, subscription, weave } from '@gqloom/core';
import { ValibotWeaver } from '@gqloom/valibot';

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), 'world') })
    .resolve(({ name }) => name),

  greetings: subscription(v.string()).subscribe(async function* () {
    yield 'Hi';
    yield 'Bonjour';
    yield 'Hola';
    yield 'Ciao';
    yield 'Zdravo';
  }),
});

const schema = weave(ValibotWeaver, helloResolver);

export const yoga = createYoga({ schema });
