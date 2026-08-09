import { MvcCdkConstructLibrary } from '@mavogel/mvc-projen';
import { javascript } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';

const project = new MvcCdkConstructLibrary({
  author: 'Manuel Vogel',
  authorAddress: '8409778+mavogel@users.noreply.github.com',
  cdkVersion: '2.263.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.9.0',
  name: '@mavogel/awscdk-rootmail',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/MV-Consulting/awscdk-rootmail',
  npmAccess: NpmAccess.PUBLIC, /* The npm access level to use when releasing this module. */
  packageManager: javascript.NodePackageManager.NPM,
  keywords: ['aws', 'cdk', 'ses', 'construct', 'rootmail'],
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
    },
  },
  deps: [
    '@mavogel/mvc-projen',
    'constructs@^10.5.1',
  ],

  bundledDeps: [
    '@aws-sdk/client-cloudwatch-logs',
    '@aws-sdk/client-route-53',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-ses',
    '@aws-sdk/client-ssm',
    'cdk-nag',
    'mailparser',
    'uuid',
  ],
  description: 'An opinionated way to secure root email addresses for AWS accounts.',
  devDeps: [
    '@types/aws-lambda',
    '@types/jsonfile',
    '@types/mailparser',
    '@types/uuid',
    '@aws-cdk/integ-runner@2.197.4',
    '@aws-cdk/integ-tests-alpha@^2.243.0-alpha.0',
    '@commitlint/cli',
    '@commitlint/config-conventional',
    'husky',
    'jsonfile',
  ],
  gitignore: [
    'venv',
    'cdk.out',
    'tmp',
  ],
});

project.package.setScript('awslint', 'awslint -x prefer-ref-interface:aws-cdk-lib.*');
project.package.setScript('prepare', 'husky install');
project.package.setScript('prepare-integ-test', 'rm -rf cdk.out && npx cdk synth -q');
project.package.setScript('integ-test', 'integ-runner --directory ./integ-tests --parallel-regions eu-west-2 --parallel-regions eu-west-1 --update-on-failed');
project.synth();