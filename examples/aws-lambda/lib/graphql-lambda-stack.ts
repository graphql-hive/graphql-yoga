import * as path from 'node:path';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';

export class GraphqlLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const graphqlLambda = new lambda.Function(this, 'graphqlLambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'graphql.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
    });

    new apiGateway.LambdaRestApi(this, 'graphqlEndpoint', {
      handler: graphqlLambda,
    });
  }
}
