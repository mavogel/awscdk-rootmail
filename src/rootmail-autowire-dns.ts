import {
  Arn,
  ArnFormat,
  CustomResource,
  Duration,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ssm as ssm,
  Stack,
  Validations,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct, Node } from 'constructs';
import {
  PROP_DOMAIN,
  PROP_SUB_DOMAIN,
  PROP_HOSTED_ZONE_PARAMETER_NAME,
  PROP_R53_CHANGEINFO_ID_PARAMETER_NAME,
  PROP_PARENT_HOSTED_ZONE_ID,
} from './rootmail-autowire-dns.on-event-handler';

export interface RootmailAutowireDnsProps {
  /**
   * Domain used for root mail feature.
   */
  readonly domain: string;

  /**
   * Subdomain used for root mail feature.
   *
   * @default 'aws'
   */
  readonly subdomain?: string;

  /**
   * The hosted zone ID of the domain that is registered Route53 AND in the same AWS account
   * to enable autowiring of the DNS records.
   *
   * @default undefined
   */
  readonly wireDNSToHostedZoneID?: string;

  /**
   * The Hosted Zone SSM Parameter Name for the NS records.
   */
  readonly hostedZoneSSMParameter: ssm.StringListParameter;

  /**
   * The total time to wait for the DNS records to be available/wired.
   */
  readonly totalTimeToWireDNS: Duration;
}

export class RootmailAutowireDns extends Construct {

  constructor(scope: Construct, id: string, props: RootmailAutowireDnsProps) {
    super(scope, id);

    const subdomain = props.subdomain ?? 'aws';
    const wireDNSToHostedZoneID = props.wireDNSToHostedZoneID ?? undefined;
    const autoWireR53ChangeInfoIdParameterName = '/rootmail/auto_wire_r53_changeinfo_id';


    // TODO: create it in the function to avoid the dummy value
    const autoWireR53ChangeInfoId = new ssm.StringParameter(this, 'AutoWireR53ChangeInfoId', {
      parameterName: autoWireR53ChangeInfoIdParameterName,
      stringValue: 'dummy',
    });

    new CustomResource(this, 'Resource', {
      serviceToken: RootmailAutowireDnsProvider.getOrCreate(this, {
        autoWireR53ChangeInfoIdParameter: autoWireR53ChangeInfoId,
        ...props,
      }),
      resourceType: 'Custom::RootmailAutowireDnsProvider',
      properties: {
        [PROP_DOMAIN]: props.domain,
        [PROP_SUB_DOMAIN]: subdomain,
        [PROP_PARENT_HOSTED_ZONE_ID]: wireDNSToHostedZoneID,
        [PROP_HOSTED_ZONE_PARAMETER_NAME]: props.hostedZoneSSMParameter.parameterName,
        [PROP_R53_CHANGEINFO_ID_PARAMETER_NAME]: autoWireR53ChangeInfoId.parameterName,
      },
    });

  }
}

interface RootmailAutowireDnsProviderProps extends RootmailAutowireDnsProps {
  readonly autoWireR53ChangeInfoIdParameter: ssm.StringParameter;
  readonly wireDNSToHostedZoneID?: string;
  readonly totalTimeToWireDNS: Duration;
}

class RootmailAutowireDnsProvider extends Construct {
  /**
   * Returns the singleton provider.
   */
  public static getOrCreate(scope: Construct, props: RootmailAutowireDnsProviderProps) {
    const stack = Stack.of(scope);
    const id = 'rootmail.autowire-dns-provider';
    const x = Node.of(stack).tryFindChild(id) as RootmailAutowireDnsProvider
      || new RootmailAutowireDnsProvider(stack, id, props);
    return x.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  constructor(scope: Construct, id: string, props: RootmailAutowireDnsProviderProps) {
    super(scope, id);

    const isCompleteHandlerFunc = new NodejsFunction(this, 'is-complete-handler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: Duration.seconds(120),
      logRetention: 1,
    });

    isCompleteHandlerFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'route53:ListHostedZonesByName',
          'route53:GetChange',
        ],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      }),
    );

    props.autoWireR53ChangeInfoIdParameter.grantRead(isCompleteHandlerFunc);

    const onEventHandlerFunc = new NodejsFunction(this, 'on-event-handler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: Duration.seconds(160), // 2m40s
      logRetention: 1,
      environment: {},
    });

    props.hostedZoneSSMParameter.grantRead(onEventHandlerFunc);
    if (props.autoWireR53ChangeInfoIdParameter !== undefined) {
      props.autoWireR53ChangeInfoIdParameter.grantWrite(onEventHandlerFunc);
    }

    onEventHandlerFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'route53:ListHostedZonesByName',
          'route53:GetChange',
        ],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      }),
    );

    if (props.wireDNSToHostedZoneID !== undefined && props.wireDNSToHostedZoneID.trim().length > 0) {
      onEventHandlerFunc.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'route53:ListResourceRecordSets',
            'route53:ChangeResourceRecordSets',
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            // arn:aws:route53:::hostedzone/H12345
            // arn:{partition}:{service}:{region}:{account}:{resource}{sep}{resource-name}
            Arn.format({
              partition: 'aws',
              service: 'route53',
              region: '',
              account: '',
              resource: 'hostedzone',
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
              resourceName: props.wireDNSToHostedZoneID,
            }),
          ],
        }),
      );
    }

    this.provider = new cr.Provider(this, 'rootmail-autowire-dns-provider', {
      isCompleteHandler: isCompleteHandlerFunc,
      queryInterval: Duration.seconds(5),
      totalTimeout: Duration.hours(2), // props.totalTimeToWireDNS, TODO does not work
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

    Validations.of(this.provider.onEventHandler!).acknowledge({ id: iam5ResourceStar, reason: reasonIam5 });
    Validations.of(this.provider.isCompleteHandler!).acknowledge({ id: iam5ResourceStar, reason: reasonIam5 });
  };
}