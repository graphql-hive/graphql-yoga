import { Output } from '@pulumi/pulumi';
import { OutputValue, Stack } from '@pulumi/pulumi/automation';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DeploymentConfiguration<TProgramOutput = {}> = {
  prerequisites?: (stack: Stack) => Promise<void>;
  config?: (stack: Stack) => Promise<void>;
  program: () => Promise<{
    [K in keyof TProgramOutput]: Output<TProgramOutput[K]> | TProgramOutput[K];
  }>;
  test: (output: {
    [K in keyof TProgramOutput]: Pick<OutputValue, 'secret'> & {
      value: TProgramOutput[K];
    };
  }) => Promise<void>;
};
