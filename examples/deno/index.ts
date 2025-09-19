import { yoga } from './yoga.ts';

Deno.serve(yoga, {
  onListen({ hostname, port }) {
    console.log(`Listening on http://${hostname}:${port}${yoga.graphqlEndpoint}`);
  },
});
