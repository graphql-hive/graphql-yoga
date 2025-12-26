import * as cf from '@pulumi/cloudflare';
import { version } from '@pulumi/cloudflare/package.json';
import * as pulumi from '@pulumi/pulumi';
import { Stack } from '@pulumi/pulumi/automation';
import { DeploymentConfiguration } from '../types';
import {
  assertGraphiQL,
  assertQuery,
  env,
  execPromise,
  fsPromises,
  waitForEndpoint,
} from '../utils';

export function createCFDeployment(
  projectName: string,
  isModule = false,
): DeploymentConfiguration<{
  workerUrl: string;
}> {
  const accountId = env('CLOUDFLARE_ACCOUNT_ID');
  return {
    prerequisites: async (stack: Stack) => {
      console.info('\t\tℹ️ Installing Pulumi CF plugin...');
      // Intall Pulumi CF Plugin
      await stack.workspace.installPlugin('cloudflare', version, 'resource');

      // Build and bundle the worker
      console.info('\t\tℹ️ Bundling the CF Worker....');
      await execPromise('bun run build', {
        cwd: '../examples/' + projectName,
      });
    },
    config: async (stack: Stack) => {
      // Configure the Pulumi environment with the CloudFlare credentials
      // This will allow Pulummi program to just run without caring about secrets/configs.
      // See: https://www.pulumi.com/registry/packages/cloudflare/installation-configuration/
      await stack.setConfig('cloudflare:apiToken', {
        value: env('CLOUDFLARE_API_TOKEN'),
      });
    },
    program: async () => {
      const stackName = pulumi.getStack();
      const workerUrl = `e2e.graphql.yoga/${stackName}`;

      // Deploy CF script as Worker
      const workerScript = new cf.WorkerScript('worker', {
        content: await fsPromises.readFile(`../examples/${projectName}/dist/index.js`, 'utf-8'),
        module: isModule,
        plainTextBindings: [
          {
            name: 'GRAPHQL_ROUTE',
            text: `/${stackName}`,
          },
          {
            name: 'DEBUG',
            text: 'true',
          },
        ],
        name: stackName,
        accountId,
      });

      // Create a nice route for easy testing
      new cf.WorkerRoute('worker-route', {
        scriptName: workerScript.name,
        pattern: workerUrl,
        zoneId: env('CLOUDFLARE_ZONE_ID'),
      });

      return {
        workerUrl: `https://${workerUrl}`,
      };
    },
    test: async ({ workerUrl }) => {
      console.log(`ℹ️ CloudFlare Worker deployed to URL: ${workerUrl.value}`);
      await waitForEndpoint(workerUrl.value, 5, 10_000);
      await assertGraphiQL(workerUrl.value);
      await assertQuery(workerUrl.value);
    },
  };
}
