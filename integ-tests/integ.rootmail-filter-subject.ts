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

const randomTestId = 'hf912a53';
const testSubdomain = `${randomTestId}-${Stack.of(stackUnderTest).region}`;
const fullDomain = `${testSubdomain}.${testDomain}`;

const customSesReceiveFunction = new NodejsFunction(stackUnderTest, 'custom-ses-receive-function', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'custom-ses-receive-function.ts'),
  runtime: lambda.Runtime.NODEJS_24_X,
  logRetention: 1,
  timeout: Duration.seconds(30),
});

customSesReceiveFunction.addToRolePolicy(new iam.PolicyStatement({
  actions: [
    's3:List*',
  ],
  resources: ['*'],
}))

const rootmail = new Rootmail(stackUnderTest, 'testRootmail', {
  domain: testDomain,
  subdomain: testSubdomain,
  // tests took on average 10-15 minutes , but we leave some buffer
  totalTimeToWireDNS: Duration.minutes(20),
  wireDNSToHostedZoneID: hostedZoneId,
  customSesReceiveFunction: customSesReceiveFunction,
  setDestroyPolicyToAllResources: false,
  filteredEmailSubjects: [
    'filter-me-subject',
    'i-want-to-be-filtered',
  ],
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

/**
 * Assertion:
 * The application should parse a dummy email, store it in S3 and set create an OPS item.
 */
const id = `test-id-${randomTestId}-filter-me-subject`;
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