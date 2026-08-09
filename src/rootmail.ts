import {
  Duration,
  Stack,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_route53 as r53,
  aws_s3 as s3,
  aws_ssm as ssm,
  CfnResource,
  IAspect,
  RemovalPolicy,
  Aspects,
  Validations,
} from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { isSESEnabledRegion, sesEnabledRegions } from './common';
import { HostedZoneDkim } from './hosted-zone-dkim';
import { SESReceive } from './ses-receive';

/**
 * Properties for the construct
 */
export interface RootmailProps {
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
   * The total time to wait for the DNS records to be available/wired.
   *
   * @default Duration.hours(2)
   */
  readonly totalTimeToWireDNS?: Duration;

  /**
   * The hosted zone ID of the domain that is registered Route53 AND in the same AWS account
   * to enable autowiring of the DNS records.
   *
   * @default emtpy string
   */
  readonly wireDNSToHostedZoneID?: string;

  /**
   * The custom SES receive function to use
   *
   * [disable-awslint:ref-via-interface]
   *
   * @default the provided functions within the construct
   */
  readonly customSesReceiveFunction?: lambda.Function;

  /**
   * Filtered email subjects. NOTE: must not contain commas.
   *
   * @default []
   */
  readonly filteredEmailSubjects?: string[];

  /**
   * The removal policy for the email bucket
   *
   * @default RemovalPolicy.RETAIN
   */
  readonly emailBucketDeletePolicy?: RemovalPolicy;

  /**
   * Whether to set all removal policies to DESTROY. This is useful for integration testing purposes.
   *
   * @default false
   */
  readonly setDestroyPolicyToAllResources?: boolean;
}

/**
 * Rootmail construct
 */
export class Rootmail extends Construct {
  /**
   * The name parameter in SSM to store the domain name server.
   */
  public readonly hostedZoneParameterName: string;

  /**
   * S3 bucket to store the root mails in
   */
  public readonly emailBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: RootmailProps) {
    super(scope, id);
    this.hostedZoneParameterName = '/rootmail/domain_name_servers';

    const domain = props.domain;
    const subdomain = props.subdomain ?? 'aws';
    const totalTimeToWireDNS = props.totalTimeToWireDNS ?? Duration.hours(2);
    const wireDNSToHostedZoneID = props.wireDNSToHostedZoneID ?? undefined;
    const setDestroyPolicyToAllResources = props.setDestroyPolicyToAllResources ?? false;
    const emailBucketDeletePolicy = props.emailBucketDeletePolicy ?? RemovalPolicy.RETAIN;
    const filteredEmailSubjects = props.filteredEmailSubjects || [];

    const deployRegion = Stack.of(this).region;
    console.log(`Deploy region is ${deployRegion}`);
    if (!isSESEnabledRegion(deployRegion)) {
      throw new Error(`SES is not available in region ${deployRegion}. Use one of the following regions: ${sesEnabledRegions.join(', ')}`);
    }

    /**
     * EMAIL Bucket
     */
    this.emailBucket = new s3.Bucket(this, 'EmailBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: emailBucketDeletePolicy,
      autoDeleteObjects: emailBucketDeletePolicy === RemovalPolicy.DESTROY,
    });
    Validations.of(this.emailBucket).acknowledge({ id: 'AwsSolutions-S1', reason: 'no server access logs needed' });
    Validations.of(this.emailBucket).acknowledge({ id: 'AwsSolutions-S10', reason: 'no SSL access needed' });
    this.emailBucket.grantPut(new iam.ServicePrincipal('ses.amazonaws.com'), 'RootMail/*');

    Validations.of(this.emailBucket.policy!).acknowledge({ id: 'AwsSolutions-S10', reason: 'no SSL access needed' });

    /**
     * HOSTED ZONE
     */
    const hostedZone = new r53.HostedZone(this, 'HostedZone', {
      zoneName: `${subdomain}.${domain}`,
    });

    const hostedZoneSSMParameter = new ssm.StringListParameter(this, 'HostedZoneSSMParameter', {
      parameterName: this.hostedZoneParameterName,
      stringListValue: hostedZone.hostedZoneNameServers || [],
    });

    new HostedZoneDkim(this, 'HostedZoneDkim', {
      domain: domain,
      subdomain: subdomain,
      hostedZone: hostedZone,
      wireDNSToHostedZoneID: wireDNSToHostedZoneID,
      hostedZoneSSMParameter: hostedZoneSSMParameter,
      totalTimeToWireDNS: totalTimeToWireDNS,
    });

    new SESReceive(this, 'SESReceive', {
      domain: domain,
      subdomain: subdomain,
      emailbucket: this.emailBucket,
      customSesReceiveFunction: props.customSesReceiveFunction,
      filteredEmailSubjects: filteredEmailSubjects,
    });

    // If Destroy Policy Aspect is present:
    if (setDestroyPolicyToAllResources) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
  }

}

/**
 * Aspect for setting all removal policies to DESTROY
 */
class ApplyDestroyPolicyAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
  }
}