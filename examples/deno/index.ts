import { yoga } from './yoga.ts';

Deno.serve(
  {
    onListen({ hostname, port }) {
      console.log(`Listening on http://${hostname}:${port}${yoga.graphqlEndpoint}`);
    },
  },
  yoga,
);
