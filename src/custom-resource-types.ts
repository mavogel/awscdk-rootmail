import type { CloudFormationCustomResourceEventCommon } from 'aws-lambda';

/**
 * Local re-declaration of aws-cdk-lib's ambient async custom resource provider-framework
 * types (`aws-cdk-lib/custom-resources/lib/provider-framework/types`). That module is type-only
 * and not part of aws-cdk-lib's package.json "exports" map, so it can't be imported directly
 * under modern TypeScript module resolution. See aws-cdk-lib's `custom-resources` README,
 * "Handling Lifecycle Events: onEvent" / "Asynchronous providers: isComplete".
 */
export interface OnEventRequest extends CloudFormationCustomResourceEventCommon {
  readonly RequestType: 'Create' | 'Update' | 'Delete';
  readonly OldResourceProperties?: { [key: string]: any };
  readonly PhysicalResourceId?: string;
}

export interface OnEventResponse {
  readonly PhysicalResourceId?: string;
  readonly Data?: { [name: string]: any };
  readonly [key: string]: any;
  readonly NoEcho?: boolean;
}
