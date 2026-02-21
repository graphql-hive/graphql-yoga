import { io } from 'socket.io-client';
import { createSocketIOGraphQLClient } from '@n1ru4l/socket-io-graphql-client';

const socket = io('http://localhost:3000');
const client = createSocketIOGraphQLClient(socket);

socket.on('connect', async () => {
  const execution = client.execute({
    operation: /* GraphQL */ `
      query {
        hello
      }
    `,
  });

  for await (const result of execution) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  }
  client.destroy();
  socket.close();
});
