import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { useManagedFederation } from '@graphql-yoga/apollo-managed-federation';
import { useApolloUsageReport } from '@graphql-yoga/plugin-apollo-usage-report';

const yoga = createYoga({
  plugins: [useManagedFederation(), useApolloUsageReport()],
});

const server = createServer(yoga);

server.listen(4000, () => {
  console.log('Server is running on http://localhost:4000');
});

process.on('SIGINT', () => {
  server.close();
});
