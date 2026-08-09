import {
  CustomResource,
  Duration,
  Stack,
  aws_iam as iam,
  aws_lambda as lambda,
  Validations,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct, Node } from 'constructs';
import { ATTR_VERIFICATION_TOKEN, ATTR_DKIM_TOKENS, PROP_DOMAIN } from './hosted-zone-dkim-verification-records.on-event-handler';

export interface HostedZoneDKIMAndVerificationRecordsProps {
  readonly domain: string;
}

export class HostedZoneDKIMAndVerificationRecords extends Construct {
  public readonly verificationToken: string;
  public readonly dkimTokens: string[];

  constructor(scope: Construct, id: string, props: HostedZoneDKIMAndVerificationRecordsProps) {
    super(scope, id);

    const resource = new CustomResource(this, 'Resource', {
      serviceToken: HostedZoneDKIMAndVerificationRecordsProvider.getOrCreate(this),
      resourceType: 'Custom::HostedZoneDKIMAndVerificationRecords',
      properties: {
        [PROP_DOMAIN]: props.domain,
      },
    });

    this.verificationToken = resource.getAttString(ATTR_VERIFICATION_TOKEN);
    this.dkimTokens = resource.getAtt(ATTR_DKIM_TOKENS).toStringList();
  }
}

class HostedZoneDKIMAndVerificationRecordsProvider extends Construct {

  /**
   * Returns the singleton provider.
   */
  public static getOrCreate(scope: Construct) {
    const stack = Stack.of(scope);
    const id = 'rootmail.hosted-zone-dkim-verification-records-provider';
    const x = Node.of(stack).tryFindChild(id) as HostedZoneDKIMAndVerificationRecordsProvider
      || new HostedZoneDKIMAndVerificationRecordsProvider(stack, id);
    return x.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const onEventHandlerFunc = new NodejsFunction(this, 'on-event-handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: 1,
      timeout: Duration.seconds(200),
    });

    onEventHandlerFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:VerifyDomainDkim',
          'ses:VerifyDomainIdentity',
          'ses:DeleteIdentity',
        ],
        resources: ['*'],
      }),
    );

    this.provider = new cr.Provider(this, 'hosted-zone-dkim-verification-records-provider', {
      onEventHandler: onEventHandlerFunc,
      logRetention: 1,
    });
    // Granular findings only. Portable IDs only: Resource::* is constant across any deployment,
    // Resource::<logical-id> findings are not. AwsSolutions-IAM4[Policy::...] cannot be
    // acknowledged at all right now - aws-cdk-lib's Validations.acknowledge() rejects any id with
    // more than one '::', and AWS managed policy ARNs always contain one (cdklabs/cdk-nag#2359,
    // #2351, both open upstream). See docs/plans/2026-08-09-bump-mvc-projen-cdk-nag-v3.md Task 3.
    const iam5ResourceStar = 'AwsSolutions-IAM5[Resource::*]';
    const reasonIam5 = 'wildcards are ok for the provider as the function has restrictions';

    Validations.of(this.provider.onEventHandler).acknowledge({ id: iam5ResourceStar, reason: reasonIam5 });
  };
}