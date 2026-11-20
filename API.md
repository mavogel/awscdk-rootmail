# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### Rootmail <a name="Rootmail" id="@mavogel/awscdk-rootmail.Rootmail"></a>

- *Implements:* constructs.IConstruct, constructs.IDependable

Rootmail construct.

#### Initializers <a name="Initializers" id="@mavogel/awscdk-rootmail.Rootmail.Initializer"></a>

```typescript
import { Rootmail } from '@mavogel/awscdk-rootmail'

new Rootmail(scope: Construct, id: string, props: RootmailProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.props">props</a></code> | <code><a href="#@mavogel/awscdk-rootmail.RootmailProps">RootmailProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@mavogel/awscdk-rootmail.Rootmail.Initializer.parameter.props"></a>

- *Type:* <a href="#@mavogel/awscdk-rootmail.RootmailProps">RootmailProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.with">with</a></code> | Applies one or more mixins to this construct. |

---

##### `toString` <a name="toString" id="@mavogel/awscdk-rootmail.Rootmail.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="@mavogel/awscdk-rootmail.Rootmail.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="@mavogel/awscdk-rootmail.Rootmail.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@mavogel/awscdk-rootmail.Rootmail.isConstruct"></a>

```typescript
import { Rootmail } from '@mavogel/awscdk-rootmail'

Rootmail.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@mavogel/awscdk-rootmail.Rootmail.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.property.emailBucket">emailBucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | S3 bucket to store the root mails in. |
| <code><a href="#@mavogel/awscdk-rootmail.Rootmail.property.hostedZoneParameterName">hostedZoneParameterName</a></code> | <code>string</code> | The name parameter in SSM to store the domain name server. |

---

##### `node`<sup>Required</sup> <a name="node" id="@mavogel/awscdk-rootmail.Rootmail.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `emailBucket`<sup>Required</sup> <a name="emailBucket" id="@mavogel/awscdk-rootmail.Rootmail.property.emailBucket"></a>

```typescript
public readonly emailBucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket

S3 bucket to store the root mails in.

---

##### `hostedZoneParameterName`<sup>Required</sup> <a name="hostedZoneParameterName" id="@mavogel/awscdk-rootmail.Rootmail.property.hostedZoneParameterName"></a>

```typescript
public readonly hostedZoneParameterName: string;
```

- *Type:* string

The name parameter in SSM to store the domain name server.

---


### SESReceive <a name="SESReceive" id="@mavogel/awscdk-rootmail.SESReceive"></a>

- *Implements:* constructs.IConstruct, constructs.IDependable

SES Receive construct.

#### Initializers <a name="Initializers" id="@mavogel/awscdk-rootmail.SESReceive.Initializer"></a>

```typescript
import { SESReceive } from '@mavogel/awscdk-rootmail'

new SESReceive(scope: Construct, id: string, props: SESReceiveProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.props">props</a></code> | <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps">SESReceiveProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@mavogel/awscdk-rootmail.SESReceive.Initializer.parameter.props"></a>

- *Type:* <a href="#@mavogel/awscdk-rootmail.SESReceiveProps">SESReceiveProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.with">with</a></code> | Applies one or more mixins to this construct. |

---

##### `toString` <a name="toString" id="@mavogel/awscdk-rootmail.SESReceive.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="@mavogel/awscdk-rootmail.SESReceive.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="@mavogel/awscdk-rootmail.SESReceive.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@mavogel/awscdk-rootmail.SESReceive.isConstruct"></a>

```typescript
import { SESReceive } from '@mavogel/awscdk-rootmail'

SESReceive.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@mavogel/awscdk-rootmail.SESReceive.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceive.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="@mavogel/awscdk-rootmail.SESReceive.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### RootmailProps <a name="RootmailProps" id="@mavogel/awscdk-rootmail.RootmailProps"></a>

Properties for the construct.

#### Initializer <a name="Initializer" id="@mavogel/awscdk-rootmail.RootmailProps.Initializer"></a>

```typescript
import { RootmailProps } from '@mavogel/awscdk-rootmail'

const rootmailProps: RootmailProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.domain">domain</a></code> | <code>string</code> | Domain used for root mail feature. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.customSesReceiveFunction">customSesReceiveFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | The custom SES receive function to use. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.emailBucketDeletePolicy">emailBucketDeletePolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | The removal policy for the email bucket. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.filteredEmailSubjects">filteredEmailSubjects</a></code> | <code>string[]</code> | Filtered email subjects. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.setDestroyPolicyToAllResources">setDestroyPolicyToAllResources</a></code> | <code>boolean</code> | Whether to set all removal policies to DESTROY. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.subdomain">subdomain</a></code> | <code>string</code> | Subdomain used for root mail feature. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.totalTimeToWireDNS">totalTimeToWireDNS</a></code> | <code>aws-cdk-lib.Duration</code> | The total time to wait for the DNS records to be available/wired. |
| <code><a href="#@mavogel/awscdk-rootmail.RootmailProps.property.wireDNSToHostedZoneID">wireDNSToHostedZoneID</a></code> | <code>string</code> | The hosted zone ID of the domain that is registered Route53 AND in the same AWS account to enable autowiring of the DNS records. |

---

##### `domain`<sup>Required</sup> <a name="domain" id="@mavogel/awscdk-rootmail.RootmailProps.property.domain"></a>

```typescript
public readonly domain: string;
```

- *Type:* string

Domain used for root mail feature.

---

##### `customSesReceiveFunction`<sup>Optional</sup> <a name="customSesReceiveFunction" id="@mavogel/awscdk-rootmail.RootmailProps.property.customSesReceiveFunction"></a>

```typescript
public readonly customSesReceiveFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function
- *Default:* the provided functions within the construct

The custom SES receive function to use.

[disable-awslint:ref-via-interface]

---

##### `emailBucketDeletePolicy`<sup>Optional</sup> <a name="emailBucketDeletePolicy" id="@mavogel/awscdk-rootmail.RootmailProps.property.emailBucketDeletePolicy"></a>

```typescript
public readonly emailBucketDeletePolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.RETAIN

The removal policy for the email bucket.

---

##### `filteredEmailSubjects`<sup>Optional</sup> <a name="filteredEmailSubjects" id="@mavogel/awscdk-rootmail.RootmailProps.property.filteredEmailSubjects"></a>

```typescript
public readonly filteredEmailSubjects: string[];
```

- *Type:* string[]
- *Default:* []

Filtered email subjects.

NOTE: must not contain commas.

---

##### `setDestroyPolicyToAllResources`<sup>Optional</sup> <a name="setDestroyPolicyToAllResources" id="@mavogel/awscdk-rootmail.RootmailProps.property.setDestroyPolicyToAllResources"></a>

```typescript
public readonly setDestroyPolicyToAllResources: boolean;
```

- *Type:* boolean
- *Default:* false

Whether to set all removal policies to DESTROY.

This is useful for integration testing purposes.

---

##### `subdomain`<sup>Optional</sup> <a name="subdomain" id="@mavogel/awscdk-rootmail.RootmailProps.property.subdomain"></a>

```typescript
public readonly subdomain: string;
```

- *Type:* string
- *Default:* 'aws'

Subdomain used for root mail feature.

---

##### `totalTimeToWireDNS`<sup>Optional</sup> <a name="totalTimeToWireDNS" id="@mavogel/awscdk-rootmail.RootmailProps.property.totalTimeToWireDNS"></a>

```typescript
public readonly totalTimeToWireDNS: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.hours(2)

The total time to wait for the DNS records to be available/wired.

---

##### `wireDNSToHostedZoneID`<sup>Optional</sup> <a name="wireDNSToHostedZoneID" id="@mavogel/awscdk-rootmail.RootmailProps.property.wireDNSToHostedZoneID"></a>

```typescript
public readonly wireDNSToHostedZoneID: string;
```

- *Type:* string
- *Default:* emtpy string

The hosted zone ID of the domain that is registered Route53 AND in the same AWS account to enable autowiring of the DNS records.

---

### SESReceiveProps <a name="SESReceiveProps" id="@mavogel/awscdk-rootmail.SESReceiveProps"></a>

Properties for the SESReceive construct.

#### Initializer <a name="Initializer" id="@mavogel/awscdk-rootmail.SESReceiveProps.Initializer"></a>

```typescript
import { SESReceiveProps } from '@mavogel/awscdk-rootmail'

const sESReceiveProps: SESReceiveProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.domain">domain</a></code> | <code>string</code> | Domain used for root mail feature. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.emailbucket">emailbucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket to store received emails. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.subdomain">subdomain</a></code> | <code>string</code> | Subdomain used for root mail feature. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.customSesReceiveFunction">customSesReceiveFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | The custom SES receive function to use. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.filteredEmailSubjects">filteredEmailSubjects</a></code> | <code>string[]</code> | Filtered email subjects. |
| <code><a href="#@mavogel/awscdk-rootmail.SESReceiveProps.property.setDestroyPolicyToAllResources">setDestroyPolicyToAllResources</a></code> | <code>boolean</code> | Whether to set all removal policies to DESTROY. |

---

##### `domain`<sup>Required</sup> <a name="domain" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.domain"></a>

```typescript
public readonly domain: string;
```

- *Type:* string

Domain used for root mail feature.

---

##### `emailbucket`<sup>Required</sup> <a name="emailbucket" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.emailbucket"></a>

```typescript
public readonly emailbucket: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket to store received emails.

[disable-awslint:prefer-ref-interface]

---

##### `subdomain`<sup>Required</sup> <a name="subdomain" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.subdomain"></a>

```typescript
public readonly subdomain: string;
```

- *Type:* string

Subdomain used for root mail feature.

---

##### `customSesReceiveFunction`<sup>Optional</sup> <a name="customSesReceiveFunction" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.customSesReceiveFunction"></a>

```typescript
public readonly customSesReceiveFunction: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function
- *Default:* the provided functions within the construct

The custom SES receive function to use.

[disable-awslint:ref-via-interface]

---

##### `filteredEmailSubjects`<sup>Optional</sup> <a name="filteredEmailSubjects" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.filteredEmailSubjects"></a>

```typescript
public readonly filteredEmailSubjects: string[];
```

- *Type:* string[]
- *Default:* 2 subjects: 'Your AWS Account is Ready - Get Started Now' and 'Welcome to Amazon Web Services'

Filtered email subjects.

NOTE: must not contain commas.

---

##### `setDestroyPolicyToAllResources`<sup>Optional</sup> <a name="setDestroyPolicyToAllResources" id="@mavogel/awscdk-rootmail.SESReceiveProps.property.setDestroyPolicyToAllResources"></a>

```typescript
public readonly setDestroyPolicyToAllResources: boolean;
```

- *Type:* boolean
- *Default:* false

Whether to set all removal policies to DESTROY.

This is useful for integration testing purposes.

---



