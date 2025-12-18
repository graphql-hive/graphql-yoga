import { createYoga } from 'graphql-yoga';
import * as z from 'zod';
import { query, resolver, subscription, weave } from '@gqloom/core';
import { ZodWeaver } from '@gqloom/zod';

const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform(value => value ?? 'world'),
    })
    .resolve(({ name }) => name),

  greetings: subscription(z.string()).subscribe(async function* () {
    yield 'Hi';
    yield 'Bonjour';
    yield 'Hola';
    yield 'Ciao';
    yield 'Zdravo';
  }),
});

const schema = weave(ZodWeaver, helloResolver);

export const yoga = createYoga({ schema });
