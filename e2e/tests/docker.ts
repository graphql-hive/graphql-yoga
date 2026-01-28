import { resolve } from 'node:path';
import * as docker from '@pulumi/docker';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentConfiguration } from '../types';
import { assertGraphiQL, assertQuery, execPromise, waitForEndpoint } from '../utils';

export const dockerDeployment = (
  image: string,
): DeploymentConfiguration<{
  endpoint: string;
}> => ({
  prerequisites: async () => {
    await execPromise('yarn run build', {
      cwd: '../examples/node-ts',
    });
  },
  program: async () => {
    const remoteImage = new docker.RemoteImage('node-image', {
      name: image,
      keepLocally: true,
    });

    const container = new docker.Container('container', {
      image: remoteImage.repoDigest,
      command: [`node`, 'index.js'],
      volumes: [
        {
          containerPath: '/app',
          hostPath: resolve('../examples/node-ts/dist'),
        },
      ],
      workingDir: '/app',
      ports: [
        {
          internal: 4000,
        },
      ],
    });

    // Since the provider picked a random ephemeral port for this container, export the endpoint.
    const endpoint = container.ports.apply(ports => `127.0.0.1:${ports![0].external}`);

    return {
      endpoint: interpolate`http://${endpoint}/graphql`,
    };
  },
  test: async ({ endpoint }) => {
    console.log(`ℹ️ Docker container deployed to URL: ${endpoint.value}`);
    await waitForEndpoint(endpoint.value, 5, 10_000);
    await assertGraphiQL(endpoint.value);
    await assertQuery(endpoint.value);
  },
});
