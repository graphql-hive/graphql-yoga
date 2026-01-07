import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as aws from '@pulumi/aws';
import * as awsNative from '@pulumi/aws-native';
import { version } from '@pulumi/aws/package.json';
import * as pulumi from '@pulumi/pulumi';
import { Stack } from '@pulumi/pulumi/automation';
import type { DeploymentConfiguration } from '../types';
import { assertGraphiQL, assertQuery, env, execPromise } from '../utils';

export const awsLambdaDeployment: DeploymentConfiguration<{
  functionUrl: string;
}> = {
  prerequisites: async (stack: Stack) => {
    console.info('\t\tℹ️ Installing AWS plugin...');
    // Intall Pulumi AWS Plugin
    await stack.workspace.installPlugin('aws', version, 'resource');

    // Build and bundle the worker
    console.info('\t\tℹ️ Bundling the AWS Lambda Function....');
    await execPromise('yarn run bundle', {
      cwd: '../examples/aws-lambda',
    });
    if (existsSync('../examples/aws-lambda/dist/index.js')) {
      console.log('\t\t✅ Found the bundled file');
    } else {
      throw new Error('Failed to bundle the AWS Lambda Function, bundle file not found.');
    }
  },
  config: async (stack: Stack) => {
    // Configure the Pulumi environment with the AWS credentials
    // This will allow Pulummi program to just run without caring about secrets/configs.
    // See: https://www.pulumi.com/registry/packages/aws/installation-configuration/
    await stack.setConfig('aws:accessKey', {
      value: env('AWS_ACCESS_KEY'),
    });
    await stack.setConfig('aws:secretKey', {
      value: env('AWS_SECRET_KEY'),
    });
    await stack.setConfig('aws:region', {
      value: env('AWS_REGION'),
    });
    await stack.setConfig('aws:allowedAccountIds', {
      value: `[${env('AWS_ACCOUNT_ID')}]`,
    });
  },
  program: async () => {
    const lambdaRole = new aws.iam.Role('lambda-role', {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'lambda.amazonaws.com',
      }),
    });

    const lambdaRolePolicy = new aws.iam.RolePolicy(
      'role-policy',
      {
        role: lambdaRole.id,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: 'arn:aws:logs:*:*:*',
            },
          ],
        },
      },
      { dependsOn: lambdaRole },
    );

    const func = new aws.lambda.Function(
      'func',
      {
        role: lambdaRole.arn,
        runtime: 'nodejs20.x',
        handler: 'index.handler',
        code: new pulumi.asset.AssetArchive({
          'index.js': new pulumi.asset.FileAsset(
            join(process.cwd(), '../examples/aws-lambda/dist/index.js'),
          ),
        }),
      },
      { dependsOn: lambdaRolePolicy },
    );

    const lambdaPermission = new aws.lambda.Permission(
      'streaming-permission',
      {
        action: 'lambda:InvokeFunctionUrl',
        function: func.arn,
        principal: '*',
        functionUrlAuthType: 'NONE',
      },
      { dependsOn: func },
    );

    const lambdaGw = new awsNative.lambda.Url(
      'streaming-url',
      {
        authType: 'NONE',
        targetFunctionArn: func.arn,
        invokeMode: 'RESPONSE_STREAM',
      },
      { dependsOn: lambdaPermission },
    );

    return {
      functionUrl: lambdaGw.functionUrl,
    };
  },
  test: async ({ functionUrl }) => {
    console.log(`ℹ️ AWS Lambda Function deployed to URL: ${functionUrl.value}`);
    const graphqlUrl = new URL('/graphql', functionUrl.value).toString();
    const assertions = await Promise.allSettled([
      assertQuery(graphqlUrl),
      assertGraphiQL(graphqlUrl),
    ]);
    const errors = assertions
      .filter<PromiseRejectedResult>(assertion => assertion.status === 'rejected')
      .map(assertion => assertion.reason);
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(error);
      }
      throw new Error('Some assertions failed. Please check the logs for more details.');
    }
  },
};
