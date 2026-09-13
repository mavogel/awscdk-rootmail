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
  npmTrustedPublishing: true,
  repositoryUrl: 'https://github.com/mavogel/awscdk-rootmail',
  npmAccess: NpmAccess.PUBLIC, /* The npm access level to use when releasing this module. */
  packageManager: javascript.NodePackageManager.NPM,
  // This repo has its own real source - don't let mvc-projen scaffold its
  // placeholder crd-example sample code on top of it.
  sampleCode: false,
  keywords: ['aws', 'cdk', 'ses', 'construct', 'rootmail'],
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
    },
  },
  deps: [
    '@mavogel/mvc-projen@^0.0.37',
    'constructs@^10.5.1',
  ],
  // `@mavogel/mvc-projen` pins its own `projen` dependency (peer ^0.103.20).
  // Keep the top-level `projen` devDependency aligned with it - otherwise
  // npm installs a second, nested `projen` for mvc-projen's synthesis, whose
  // builtin task names the top-level `projen` CLI can't resolve at runtime,
  // breaking `npx projen release` with "Cannot find module
  // '.../bump-version.task.js'". See mavogel/cdk-vscode-server's .projenrc.ts
  // for the same issue.
  projenVersion: '^0.103.20',
  // Exclude `projen` from auto-upgrade so it stays aligned with mvc-projen's
  // pin; bump it deliberately alongside a `@mavogel/mvc-projen` version bump.
  depsUpgradeOptions: {
    exclude: ['projen'],
  },

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

// build.yml's `self-mutation` job needs the checkout's persisted credential
// to `git push` its patch back to the PR branch - extend mvc-projen's
// generated .github/zizmor.yml (which only covers dangerous-triggers) with
// this repo-specific artipacked exception. The line number is specific to
// this workflow's current shape; re-check it against `zizmor .` output if
// build.yml's job order changes.
project.tryFindObjectFile('.github/zizmor.yml')?.addOverride('rules.artipacked.ignore', ['build.yml:80']);

project.package.setScript('awslint', 'awslint -x prefer-ref-interface:aws-cdk-lib.*');
project.package.setScript('prepare', 'husky install');
project.package.setScript('prepare-integ-test', 'rm -rf cdk.out && npx cdk synth -q');
project.package.setScript('integ-test', 'integ-runner --directory ./integ-tests --parallel-regions eu-west-2 --parallel-regions eu-west-1 --update-on-failed');
project.synth();