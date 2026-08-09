import {
  CustomResource,
  Duration,
  Stack,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  Validations,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct, Node } from 'constructs';
import {
  PROP_DOMAIN,
  PROP_SUBDOMAIN,
  PROP_EMAILBUCKET_NAME,
  PROP_OPS_SANTA_FUNCTION_ARN,
  FILTERED_EMAIL_SUBJECTS,
} from './ses-receipt-ruleset-activation.on-event-handler';

export interface SESReceiptRuleSetActivationProps {
  readonly domain: string;
  readonly subdomain: string;
  readonly emailbucket: s3.IBucket;
  readonly opsSantaFunctionArn: string;
  readonly filteredEmailSubjects: string[];
}

export class SESReceiptRuleSetActivation extends Construct {
  constructor(scope: Construct,
    id: string, props: SESReceiptRuleSetActivationProps) {
    super(scope, id);

    new CustomResource(this, 'Resource', {
      serviceToken: SESReceiptRuleSetActivationProvider.getOrCreate(this, { emailbucket: props.emailbucket }),
      resourceType: 'Custom::SESReceiptRuleSetActivation',
      properties: {
        [PROP_DOMAIN]: props.domain,
        [PROP_SUBDOMAIN]: props.subdomain,
        [PROP_EMAILBUCKET_NAME]: props.emailbucket.bucketName,
        [PROP_OPS_SANTA_FUNCTION_ARN]: props.opsSantaFunctionArn,
        [FILTERED_EMAIL_SUBJECTS]: props.filteredEmailSubjects.join(','), // as we can only pass in strings
      },
    });
  }
}

interface SESReceiptRuleSetActivationProviderProps {
  readonly emailbucket: s3.IBucket;
}

class SESReceiptRuleSetActivationProvider extends Construct {

  /**
   * Returns the singleton provider.
   */
  public static getOrCreate(scope: Construct, props: SESReceiptRuleSetActivationProviderProps) {
    const stack = Stack.of(scope);
    const id = 'rootmail.ses-receipt-ruleset-activation-provider';
    const x = Node.of(stack).tryFindChild(id) as SESReceiptRuleSetActivationProvider
      || new SESReceiptRuleSetActivationProvider(stack, id, props);
    return x.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  constructor(scope: Construct, id: string, props: SESReceiptRuleSetActivationProviderProps) {
    super(scope, id);

    const onEventHandlerFuncRole = new iam.Role(this, 'SesReceiptRuleSetActivationCustomResourceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    onEventHandlerFuncRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    onEventHandlerFuncRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:CreateReceiptRuleSet',
          'ses:CreateReceiptRule',
          'ses:SetActiveReceiptRuleSet',
          'ses:DeleteReceiptRule',
          'ses:DeleteReceiptRuleSet',
        ],
        resources: ['*'],
      }),
    );

    const onEventHandlerFunc = new NodejsFunction(this, 'on-event-handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: 1,
      role: onEventHandlerFuncRole,
      timeout: Duration.seconds(30),
      //  Note: we use the resource properties from above as it is a CustomResource
      environment: {},
    });

    const isCompleteHandlerFunc = new NodejsFunction(this, 'is-complete-handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: 1,
      timeout: Duration.seconds(30),
      //  Note: we use the resource properties from above as it is a CustomResource
      environment: {},
    });
    props.emailbucket.grantRead(isCompleteHandlerFunc, 'RootMail/*');

    this.provider = new cr.Provider(this, 'ses-receipt-ruleset-activation-provider', {
      onEventHandler: onEventHandlerFunc,
      isCompleteHandler: isCompleteHandlerFunc,
      queryInterval: Duration.seconds(10),
      totalTimeout: Duration.minutes(2), // TODO: make this configurable
      logRetention: 1,
    });
    // Granular findings only. Portable IDs only: Resource::* is constant across any deployment,
    // Resource::<logical-id> findings are not. AwsSolutions-IAM4[Policy::...] cannot be
    // acknowledged at all right now - aws-cdk-lib's Validations.acknowledge() rejects any id with
    // more than one '::', and AWS managed policy ARNs always contain one (cdklabs/cdk-nag#2359,
    // #2351, both open upstream). See docs/plans/2026-08-09-bump-mvc-projen-cdk-nag-v3.md Task 3.
    // onEventHandlerFuncRole is acknowledged directly (not via this.provider.onEventHandler) since
    // it is passed in as an explicit role - a sibling construct, not a descendant of the Function.
    const iam5ResourceStar = 'AwsSolutions-IAM5[Resource::*]';
    const reasonIam5 = 'wildcards are ok for the provider as the function has restrictions';

    Validations.of(onEventHandlerFuncRole).acknowledge({ id: iam5ResourceStar, reason: reasonIam5 });
    // emailbucket.grantRead(isCompleteHandlerFunc, 'RootMail/*') generates wildcard-action findings
    // (literal action strings, portable across any deployment).
    for (const action of ['s3:GetBucket*', 's3:GetObject*', 's3:List*']) {
      Validations.of(isCompleteHandlerFunc).acknowledge({ id: `AwsSolutions-IAM5[Action::${action}]`, reason: 'scoped read access to the RootMail prefix, wildcard is the S3 action-family suffix' });
    }
  }
}