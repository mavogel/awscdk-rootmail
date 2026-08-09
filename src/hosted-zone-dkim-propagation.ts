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
import { PROP_DOMAIN } from './hosted-zone-dkim-propagation.on-event-handler';

export interface HostedZoneDKIMPropagationProps {
  readonly domain: string;
  readonly totalTimeToWireDNS?: Duration;
}

export class HostedZoneDKIMPropagation extends Construct {
  constructor(scope: Construct, id: string, props: HostedZoneDKIMPropagationProps) {
    super(scope, id);

    new CustomResource(this, 'Resource', {
      serviceToken: HostedZoneDKIMPropagationProvider.getOrCreate(this, { totalTimeToWireDNS: props.totalTimeToWireDNS }),
      resourceType: 'Custom::HostedZoneDKIMPropagation',
      properties: {
        [PROP_DOMAIN]: props.domain,
      },
    });
  }
}

interface HostedZoneDKIMPropagationProviderProps {
  readonly totalTimeToWireDNS?: Duration;
}

class HostedZoneDKIMPropagationProvider extends Construct {

  /**
   * Returns the singleton provider.
   */
  public static getOrCreate(scope: Construct, props: HostedZoneDKIMPropagationProviderProps) {
    const stack = Stack.of(scope);
    const id = 'rootmail.hosted-zone-dkim-propagation-provider';
    const x = Node.of(stack).tryFindChild(id) as HostedZoneDKIMPropagationProvider
      || new HostedZoneDKIMPropagationProvider(stack, id, props);
    return x.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  constructor(scope: Construct, id: string, props: HostedZoneDKIMPropagationProviderProps) {
    super(scope, id);

    const isCompleteHandlerFunc = new NodejsFunction(this, 'is-complete-handler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      logRetention: 1,
      timeout: Duration.seconds(30),
    });

    isCompleteHandlerFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:GetIdentityVerificationAttributes',
          'ses:GetAccountSendingEnabled',
          'ses:GetIdentityDkimAttributes',
          'ses:GetIdentityNotificationAttributes',
        ],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      }),
    );

    const onEventHandlerFunc = new NodejsFunction(this, 'on-event-handler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      logRetention: 1,
      timeout: Duration.seconds(10),
    });

    this.provider = new cr.Provider(this, 'hosted-zone-dkim-propagation-provider', {
      isCompleteHandler: isCompleteHandlerFunc,
      queryInterval: Duration.seconds(10),
      totalTimeout: props.totalTimeToWireDNS,
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

    Validations.of(this.provider.isCompleteHandler!).acknowledge({ id: iam5ResourceStar, reason: reasonIam5 });
  };
}

