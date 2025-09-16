import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { awsLambdaDeployment } from './tests/aws-lambda';
import { azureFunctionDeployment } from './tests/azure-function';
import { cfModulesDeployment } from './tests/cf-modules';
import { cloudFlareDeployment } from './tests/cf-worker';
import { dockerDeployment } from './tests/docker';
import { vercelDeployment } from './tests/vercel';
import { DeploymentConfiguration } from './types';
import { env, getCommitId } from './utils';

const AVAILABLE_TEST_PLANS = {
  'cf-worker': cloudFlareDeployment,
  'cf-modules': cfModulesDeployment,
  'azure-function': azureFunctionDeployment,
  'aws-lambda': awsLambdaDeployment,
  'vercel-function': vercelDeployment,
  'docker-node': dockerDeployment('node:24'),
};

async function main() {
  const commitId = await getCommitId();
  const testPlaneName = env('TEST_PLAN_NAME');
  const identifier = `yoga-${testPlaneName}-e2e-${commitId}`;
  const testPlan: DeploymentConfiguration = AVAILABLE_TEST_PLANS[testPlaneName];

  if (!testPlan) {
    throw new Error(`Test plan ${testPlaneName} not found`);
  }

  const ensureDeletion = !!process.env.ENSURE_DELETION;
  const stack = await LocalWorkspace.createOrSelectStack({
    projectName: 'yoga-e2e',
    stackName: identifier,
    program: testPlan.program,
  });

  try {
    // In case of deletion, we need to ensure that the stack is deleted only (see "finally" block)
    if (ensureDeletion) {
      console.info(`🚀 Ensuring deletion for ${testPlaneName} with identifier: ${identifier}`);

      const info = await stack.info();
      console.info(`ℹ️ Current Pulumi stack status: ${info?.result}`);

      if (info?.result === 'in-progress' || info?.result === 'not-started') {
        console.info('ℹ️ Cancelling in-progress Pulumi update...', {
          version: info.version,
          startTime: info.startTime,
          result: info.result,
        });

        await stack.cancel();
      }
    } else {
      console.info(`🚀 Running test plan: ${testPlaneName} with identifier: ${identifier}`);
      console.info(`ℹ️ Creating new temporary Pulumi environment...`);
      console.info(`\t✅ Successfully initialized stack...`);
      console.info('\tℹ️ Running prerequisites...');
      if (testPlan.prerequisites) {
        await testPlan.prerequisites(stack);
      }
      console.info('\t✅ Done with prerequisites');
      console.info('\tℹ️ Setting up Pulumi config...');
      if (testPlan.config) {
        await testPlan.config(stack);
      }
      console.info('\t✅ Pulumi configuration is now set');
      console.info('ℹ️ Running Pulumi program...');
      const info = await stack.info();
      console.info(`ℹ️ Current Pulumi stack status: ${info?.result}`);

      let shouldRefresh = !process.env.CI;

      // This is done in order to make sure not to fail on a previously running / zombie
      // jobs in Pulumi. If we had to cancel an existing stack, we want to make sure to wait for the cleanup
      // to be done, so we set shouldRefresh=true
      if (info?.result === 'in-progress' || info?.result === 'not-started') {
        console.info('ℹ️ Cancelling in-progress Pulumi update...', {
          version: info.version,
          startTime: info.startTime,
          result: info.result,
        });

        await stack.cancel();
        shouldRefresh = true;
      }

      // Since we are going to deploy a fresh deployment, we don't really need to run Pulumi refresh.
      // When experimenting locally with e2e testing, this is needed to make sure to get the latest changes.
      // Also, if we had to cancel a zombie/hanging Pulumi jobs.
      if (shouldRefresh) {
        console.info('ℹ️ Refreshing Pulumi state...');
        await stack.refresh({ onOutput: console.log });
      }

      const upRes = await stack.up({ onOutput: console.log });
      console.log(
        `✅ Pulumi program execution done, infrastructure is now provisioned. Pulumi outputs:`,
        upRes.outputs,
      );
      console.info(`🚀 Running "${testPlaneName}" tests...`);
      await testPlan.test(upRes.outputs);
      console.info('✅ Tests execution is done!');
    }
  } catch (e) {
    console.error(`⚠️ Failed to run test plan, error: `, e);
    throw e;
  } finally {
    // In KEEP is set, we can test and experiment with deployment before they are being removed.
    // DOTAN: If you are using it, please make sure to run it again without `KEEP` set to make sure to remove all resources, or delete manually.
    if (process.env.KEEP) {
      console.info('<---> KEEPING RESOURCES <--->');
    } else {
      // DOTAN: maybe there is a way to tell Pulumi to start the delete process, but not wait for all resources to be deleted?
      // This section adds ~30-60s on Azure Functions (because it has ~10 "heavy" resources to delete)
      console.info('ℹ️ Destroying stack and removing all resources... this may take a while...');
      await stack.destroy({ onOutput: console.log });
      console.info('✅ Destroy/cleanup done');
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
