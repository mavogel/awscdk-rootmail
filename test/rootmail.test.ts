import {
  App,
  Stack,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Rootmail, RootmailProps } from '../src';
import { normalizeAssetHashes } from './template-utils';

describe('rootmail-autoDns', () => {
  test('rootmail-no-autoDNSEnable', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: RootmailProps = {
      domain: 'example.com',
    };

    new Rootmail(stack, 'testRootmail', testProps);

    const template = Template.fromStack(stack);
    expect(normalizeAssetHashes(template.toJSON())).toMatchSnapshot();
  });

  test('rootmail-create-with-autoDNSEnable', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: RootmailProps = {
      domain: 'example.com',
      wireDNSToHostedZoneID: 'HZX1234',
    };

    new Rootmail(stack, 'testRootmail', testProps);

    const template = Template.fromStack(stack);
    expect(normalizeAssetHashes(template.toJSON())).toMatchSnapshot();
  });
});

describe('rootmail-cdk-nag-AwsSolutions-Pack', () => {
  let stack: Stack;
  let app: App;
  // In this case we can use beforeAll() over beforeEach() since our tests
  // do not modify the state of the application
  beforeAll(() => {
    // GIVEN
    app = new App();
    stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    new Rootmail(stack, 'testRootmail', {
      domain: 'example.com',
    });
  });

  // THEN
  test('No unacknowledged IAM4/IAM5 violations for portable finding IDs', () => {
    const report = new AwsSolutionsChecks(app, { verbose: true }).validateScope(stack);
    const relevant = report.violations.filter((violation) => {
      // This construct's acknowledgments only address IAM4/IAM5; other rule categories
      // (e.g. AwsSolutions-L1, -SF1, -SF2) are pre-existing gaps never covered by the v2
      // suppressions either (the v2 test was skipped) and are tracked separately - see
      // docs/plans/2026-08-09-bump-mvc-projen-cdk-nag-v3.md Task 4.
      if (!violation.ruleName.startsWith('AwsSolutions-IAM4') && !violation.ruleName.startsWith('AwsSolutions-IAM5')) {
        return false;
      }
      // AwsSolutions-IAM4[Policy::...] can never be acknowledged: aws-cdk-lib's
      // Validations.acknowledge() rejects any id with more than one '::', and every AWS
      // managed policy ARN contains one (cdklabs/cdk-nag#2359, #2351, both open upstream).
      if (violation.ruleName.startsWith('AwsSolutions-IAM4')) {
        return false;
      }
      // Findings whose id embeds a CDK-generated logical id (e.g. <BucketABC123.Arn>) or a
      // literal account/region are not portable to a consumer's deployment - an id harvested
      // from this test's stack would not match theirs. Only the portable forms (Resource::*,
      // a literal Action::<name>) are acknowledged in src/ and asserted here.
      if (/<[^>]+>/.test(violation.ruleName) || /:\d{4,}:/.test(violation.ruleName)) {
        return false;
      }
      // The stack-level LogRetention singleton sits outside every construct this library owns.
      if (violation.violatingResources.every((r) => r.constructPath?.startsWith('testStack/LogRetention'))) {
        return false;
      }
      return true;
    });
    if (relevant.length > 0) {
      for (const violation of relevant) {
        console.log(`id: '${violation.ruleName}': ${violation.violatingResources.map((r) => r.constructPath).join(', ')}`);
      }
    }
    expect(relevant).toHaveLength(0);
  });
});