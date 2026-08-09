import path from 'path';
import {
  App,
  Duration,
  Stack,
  aws_lambda as lambda,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { SESReceive, SESReceiveProps } from '../src';

describe('ses-receive-stack', () => {
  test('ses-receive-stack-create', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'eu-west-1',
        account: '1234',
      },
    });

    const emailBucket = new s3.Bucket(stack, 'EmailBucket', {
      bucketName: 'test-email-bucket',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const testProps: SESReceiveProps = {
      domain: 'example.com',
      subdomain: 'aws',
      emailbucket: emailBucket,
    };

    new SESReceive(stack, 'testSesReceive', testProps);

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('ses-receive-stack-custom-ses', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'eu-west-1',
        account: '1234',
      },
    });

    const emailBucket = new s3.Bucket(stack, 'EmailBucket', {
      bucketName: 'test-email-bucket',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const customSesReceiveFunction = new NodejsFunction(stack, 'custom-ses-receive-function', {
      entry: path.join(__dirname, 'functions/custom-ses-receive-function.ts'),
      runtime: lambda.Runtime.NODEJS_24_X,
      logRetention: 1,
      timeout: Duration.seconds(30),
    });

    const testProps: SESReceiveProps = {
      domain: 'example.com',
      subdomain: 'aws',
      emailbucket: emailBucket,
      customSesReceiveFunction: customSesReceiveFunction,
    };

    new SESReceive(stack, 'testSesReceiveCustomFunc', testProps);

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});