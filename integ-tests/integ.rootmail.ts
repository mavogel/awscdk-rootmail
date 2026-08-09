import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { IntegTest, ExpectedResult, LogType, InvocationType } from '@aws-cdk/integ-tests-alpha';
import {
  App,
  Duration,
  PhysicalName,
  Stack,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Rootmail } from '../src/rootmail';
import { testDomain, hostedZoneId } from './common';
// CDK App for Integration Tests
const app = new App();
// Stack under test
const stackUnderTestName = 'RootmailIntegTestStack';
const stackUnderTest = new Stack(app, stackUnderTestName, {
  description: "This stack includes the application's resources for integration testing.",
});

const randomTestId = 'b647df97';
const testSubdomain = `${randomTestId}-${Stack.of(stackUnderTest).region}`;
const fullDomain = `${testSubdomain}.${testDomain}`;

const rootmail = new Rootmail(stackUnderTest, 'testRootmail', {
  domain: testDomain,
  subdomain: testSubdomain,
  // tests took on average 10-15 minutes , but we leave some buffer
  totalTimeToWireDNS: Duration.minutes(20),
  wireDNSToHostedZoneID: hostedZoneId,
  setDestroyPolicyToAllResources: false,
});


// Initialize Integ Test construct
const integStackName = 'SetupTestIntegStack';
const integ = new IntegTest(app, integStackName, {
  testCases: [stackUnderTest], // Define a list of cases for this test
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  hooks: {
    postDestroy: [
      'echo "Post hook"',
      // NOTE: as I do not see the hook called, we need to delete manually
      // `echo "Deleting S3 bucket '${rootmail.emailBucket.bucketName}'`,
      // `python3 cleanup/empty-and-delete-s3-bucket.py ${rootmail.emailBucket.bucketName}`,
    ],
  },
  regions: [stackUnderTest.region],
});

const sendEmailHandler = new NodejsFunction(stackUnderTest, 'send-email-handler', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'send-email-handler.ts'),
  runtime: lambda.Runtime.NODEJS_24_X,
  logRetention: 1,
  timeout: Duration.seconds(30),
  initialPolicy: [
    new iam.PolicyStatement({
      actions: [
        'ses:SendEmail',
        'ses:DescribeReceiptRule',
      ],
      resources: ['*'],
    }),
  ],
});

const closeOpsItemHandler = new NodejsFunction(stackUnderTest, 'close-opsitem-handler', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'close-opsitem-handler.ts'),
  runtime: lambda.Runtime.NODEJS_24_X,
  logRetention: 1,
  timeout: Duration.seconds(180),
  initialPolicy: [
    new iam.PolicyStatement({
      actions: [
        'ssm:GetOpsSummary',
        'ssm:UpdateOpsItem',
      ],
      resources: ['*'],
    }),
  ],
});

/**
 * Assertion:
 * The application should parse a dummy email, store it in S3 and set create an OPS item.
 */
const id = `test-id-${randomTestId}`;
const message = 'This is a mail body';

const sendTestEmailAssertion = integ.assertions
  .invokeFunction({
    functionName: sendEmailHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE, // to run it synchronously
    payload: JSON.stringify({
      id: id,
      text: message,
      sourceMail: `test@${fullDomain}`,
      toMail: `root+${id}@${fullDomain}`,
    }),
  }).expect(ExpectedResult.objectLike({ Payload: '"OK"' }));


const validateOpsItemAssertion = integ.assertions
  .invokeFunction({
    functionName: closeOpsItemHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE, // to run it synchronously
    payload: JSON.stringify({
      title: id,
      source: `root+${id}@${fullDomain}`,
      description: `${message}\n`,
    }),
  }).expect(ExpectedResult.objectLike({ Payload: '"OK"' }));
// NOTE: this is not working as expected
// .waitForAssertions({
//   totalTimeout: Duration.minutes(2),
//   interval: Duration.seconds(10),
// });

const getHostedZoneParametersAssertion = integ.assertions
  /**
  * Check that parameter are present
  */
  .awsApiCall('SSM', 'getParameter', {
    Name: rootmail.hostedZoneParameterName,
  })
  .expect(
    ExpectedResult.objectLike({
      Parameter: {
        Name: rootmail.hostedZoneParameterName,
        Type: 'StringList',
      },
    }),
  );

/**
 * Main test case
 */
// check the parameter store
getHostedZoneParametersAssertion
  // Send a test email
  .next(sendTestEmailAssertion)
  // Validate and close the OPS item that was created.
  .next(validateOpsItemAssertion);