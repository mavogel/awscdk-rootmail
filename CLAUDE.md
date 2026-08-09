# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains `@mavogel/awscdk-rootmail`, an AWS CDK construct library that provides an opinionated way to secure root email addresses for AWS accounts. It implements a single email box solution for all root user emails across AWS organizations, based on the superwerker rootmail feature.

## Core Architecture

### Main Components

- **Rootmail Construct** (`src/rootmail.ts`) - Main construct that orchestrates the entire solution
- **SES Receive** (`src/ses-receive.ts`) - Handles incoming email processing through SES
- **Hosted Zone DKIM** (`src/hosted-zone-dkim.ts`) - Manages DNS setup and DKIM configuration
- **DNS Autowiring** (`src/rootmail-autowire-dns.ts`) - Automatically configures DNS records when parent hosted zone is in same account

### Architecture Pattern

The solution creates a subdomain (e.g., `aws.mycompany.com`) that receives all root emails. Key components:

1. **Route53 Hosted Zone** - For the subdomain 
2. **SES Receipt Rules** - To process incoming emails
3. **S3 Bucket** - To store received emails
4. **Lambda Functions** - For email processing and DNS propagation
5. **SSM Parameters** - To store configuration values

### Custom Resource Handlers

The construct uses several custom resource handlers for orchestration:
- `hosted-zone-dkim-propagation.*` - Waits for DNS propagation
- `hosted-zone-dkim-verification-records.*` - Sets up DKIM verification
- `rootmail-autowire-dns.*` - Auto-configures parent DNS records
- `ses-receipt-ruleset-activation.*` - Activates SES receipt rules

## Development Commands

### Build and Test
```bash
# Build the project
npm run build
# or
npx projen build

# Run tests
npm test
# or
npx projen test

# Watch mode for tests
npm run test:watch

# Type checking and linting
npm run eslint
```

### CDK Operations
```bash
# Prepare for integration tests
npm run prepare-integ-test

# Run integration tests
npm run integ-test
```

### Development Workflow
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package for distribution
npm run package
```

## Testing

### Unit Tests
- Located in `test/` directory
- Uses Jest with snapshot testing
- Run with `npm test`
- Coverage reports generated in `coverage/` directory

### Integration Tests
- Located in `integ-tests/` directory  
- Uses CDK Integration Testing framework
- Tests real AWS deployments in regions: `eu-west-1`, `eu-west-2`
- Run with `npm run integ-test`
- Includes cleanup scripts for post-test resource removal

### Test Requirements
- AWS credentials configured for integration tests
- Python environment for cleanup scripts (see `integ-tests/requirements.txt`)

## Key Configuration Files

### Projen Configuration
- `.projenrc.ts` - Projen project configuration
- Uses `@mavogel/mvc-projen` for standardized project setup

### CDK Configuration  
- `cdk.json` - CDK configuration
- `tsconfig.json` - TypeScript configuration for JSII compilation

### Package Configuration
- Uses npm as package manager
- JSII-compatible TypeScript library for multi-language support
- Bundles AWS SDK dependencies to avoid version conflicts

## Supported AWS Regions

SES is not available in all regions. The construct validates deployment regions against:
- `us-east-1` (N. Virginia)
- `eu-west-1` (Ireland) 
- `us-west-2` (Oregon)
- `eu-central-1` (Frankfurt)
- `us-east-2` (Ohio)
- `ca-central-1` (Canada Central)
- `ap-northeast-1` (Tokyo)
- `ap-southeast-1` (Singapore)
- `ap-southeast-2` (Sydney)

## Security and Compliance

- Uses `cdk-nag` for AWS security best practices validation
- All resources follow AWS Well-Architected Framework principles
- S3 buckets have public access blocked and encryption enabled
- IAM policies follow principle of least privilege
- CDK Nag findings acknowledged via `Validations.of(construct).acknowledge({ id, reason })` (cdk-nag v3), documented with justifications

## Important Notes

- **Email Size Limit**: AWS accounts can have maximum 64 characters for email addresses
- **Domain Requirements**: Parent domain must be registered in Route53 in the same AWS account for auto-wiring
- **SES Region Validation**: Construct will throw error if deployed to unsupported SES regions
- **Cleanup**: Integration tests include automated cleanup of created resources