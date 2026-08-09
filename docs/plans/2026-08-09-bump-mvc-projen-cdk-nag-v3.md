# mvc-projen 0.0.30 + cdk-nag v3 Migration Implementation Plan

Created: 2026-08-09
Author: info@manuel-vogel.de
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The library builds and publishes on `@mavogel/mvc-projen` 0.0.30 / `aws-cdk-lib` 2.263.0 / `cdk-nag` 3.x, with every cdk-nag suppression migrated to `Validations.of().acknowledge()` and proven effective by an un-skipped nag test.

## Out of Scope

- Adopting cdk-nag v3's `writeSuppressionsToCloudFormation` option. It is a *pack registration* flag, and this repo is a construct library that never registers the pack in shipped code — only a consuming app can set it. See Risks.
- Authoring a custom `NagPack`. The repo only consumes `AwsSolutionsChecks`, so the v3 `visit()` → `checkResource()` rewrite in the migration guide does not apply.
- Changing which rules are suppressed, or the security posture they encode. Reasons carry over verbatim; only the ID granularity changes.

## Approach

**Chosen:** Bump `cdkVersion` in `.projenrc.ts` and translate all 7 `NagSuppressions` call sites to `Validations.of(construct).acknowledge(...)` in one atomic change, then drive the exact acknowledgment IDs from a re-enabled nag test.

**Why:** cdk-nag v3 arrives automatically with mvc-projen 0.0.30 (which hardcodes `cdk-nag@^3.0.1`) and instantly breaks compilation, so the bump and the API migration cannot land separately — there is no green intermediate state. Splitting the *ID refinement* into its own task is possible because bare rule IDs compile fine; they are just ineffective for IAM4/IAM5, which the test then exposes. The cost is that Task 1's diff is large (toolchain + 6 source files + regenerated snapshots) and must be reviewed as one unit.

## Global Constraints

- `aws-cdk-lib` target: `2.263.0`. This becomes the published `peerDependencies` floor (`^2.263.0`).
- `constructs` floor: `^10.5.1` — the max of the two peer requirements: `node_modules/cdk-nag/package.json` `peerDependencies.constructs` is `^10.5.1`, and aws-cdk-lib 2.263.0's own is `^10.5.0`. `.projenrc.ts` currently declares `^10.4.2`.
- `package.json`, `tsconfig.json`, `.projen/*`, and all workflow files are **projen-generated**. Edit `.projenrc.ts` and run `npx projen`; never hand-edit the generated files.
- cdk-nag acknowledgment IDs are matched by **exact string equality** (`node_modules/cdk-nag/lib/nag-pack.js:141`, `ids.includes(ruleId)`). There is no prefix matching.
- Acknowledgment call shape: **one `Validations.of(construct).acknowledge({ id, reason })` call per (construct × rule) pair**, matching the examples in `node_modules/cdk-nag/MIGRATION.md:70-86`. `Validations` is imported from the `aws-cdk-lib` root.

## Context for Implementer

The working tree already carries a partial, non-working attempt at this bump from a prior `/fix` session: `@mavogel/mvc-projen@^0.0.30` is installed, `npx projen` has been run once (adding `projenrc/`, `tsconfig.json`, `test/tsconfig.json`, deleting `tsconfig.dev.json`), and `cdk-nag` resolved to 3.0.2 — which is why the build currently fails. Do not revert it; Task 1 builds forward from this state. `.projenrc.ts` itself is unmodified.

Two cdk-nag v3 semantics decide the whole migration, both verified by reading `node_modules/cdk-nag/lib/nag-pack.js`:

1. **Ancestor cascade is automatic.** `isAcknowledged` walks `current = current.node.scope` up the construct tree, so an acknowledgment on a parent covers all descendants. The v2 `applyToChildren` third argument (`true` at every call site here) has no v3 equivalent and simply drops.
2. **Findings-array rules need granular IDs.** When a rule returns an array rather than a `NagRuleCompliance`, the violation ID becomes `` `${ruleId}[${finding}]` `` (`nag-pack.js:87`). `AwsSolutions-IAM4` (`rules/iam/IAMNoManagedPolicies.js:28`) and `AwsSolutions-IAM5` (`rules/iam/IAMNoWildcardPermissions.js:29`) both do this, emitting IDs like `AwsSolutions-IAM4[Policy::arn:aws:iam::aws:policy/...]` and `AwsSolutions-IAM5[Resource::*]`. A bare `AwsSolutions-IAM5` acknowledgment matches **nothing**. `AwsSolutions-S1` and `AwsSolutions-S10` return plain compliance values, so their bare IDs work as-is.

Consequence: the exact IAM4/IAM5 finding IDs cannot be derived by reading code — they depend on the policies CDK generates. They must be harvested by running the pack (Task 2).

Do **not** collapse the 5-construct suppression arrays down to `this.provider` on the assumption that the cascade covers them. In `src/hosted-zone-dkim-propagation.ts:55-85` (and the sibling provider files) the handler functions are created as **siblings** of the `cr.Provider`, not children — `new NodejsFunction(this, 'is-complete-handler', …)` and `new cr.Provider(this, '…-provider', …)` share a scope. Translate one `acknowledge()` call per construct in each array.

## Runtime Environment

No running service. Verification is `npm run build` plus the Jest suite.

## Feature Inventory

Every `NagSuppressions` call site and its migration target. All 7 must be mapped; none are dropped.

| # | File:line | Constructs suppressed | Rule IDs | Granular IDs needed? |
|---|-----------|----------------------|----------|---------------------|
| 1 | `src/rootmail.ts:123` | `this.emailBucket` | S1, S10 | No — bare IDs match |
| 2 | `src/rootmail.ts:131` | `this.emailBucket.policy!` | S10 | No — bare ID matches |
| 3 | `src/ses-receive.ts:127` | `opsSantaFunctionRole` | IAM4, IAM5 | **Yes** |
| 4 | `src/rootmail-autowire-dns.ts:186` | provider, onEventHandler, its role, isCompleteHandler, its role (5) | IAM4, IAM5 | **Yes** |
| 5 | `src/hosted-zone-dkim-propagation.ts:87` | same 5-construct shape | IAM4, IAM5 | **Yes** |
| 6 | `src/hosted-zone-dkim-verification-records.ts:77` | provider, onEventHandler, its role (3) | IAM4, IAM5 | **Yes** |
| 7 | `src/ses-receipt-ruleset-activation.ts:113` | same 5-construct shape | IAM4, IAM5 | **Yes** |

Also migrating: `test/rootmail.test.ts:71` registers the pack via `Aspects.of(stack).add(new AwsSolutionsChecks({verbose: true}))` — v3 requires `new AwsSolutionsChecks(app, {verbose: true})` and `Validations.of(app).addPlugins(...)` / `validateScope(stack)`.

## Assumptions

- `AwsSolutionsChecks.validateScope(stack)` can be called directly from a Jest test without a full `app.synth()`, returning a `PolicyValidationPluginReport` whose `violations[].ruleName` carries the full granular ID. `validateScope` is documented as "the primary entry point for testing" (`nag-pack.d.ts:74-79`) and exists at `nag-pack.js:47`. Task 2 depends on this; if it proves false in practice, fall back to `app.synth()` and reading `policy-validation-report.json` from the cloud assembly.
- The `Validations` API details above were verified against a scratch install of aws-cdk-lib 2.263.0, since the currently-installed tree is 2.243.0 and predates `Validations` entirely. Task 1 re-confirms them the moment the bump lands and the code compiles.
- The v2→v3 upgrade drops the `Metadata.cdk_nag.rules_to_suppress` blocks currently present in the committed snapshots (158 in `rootmail.test.ts.snap`, 48 in `ses-receive.test.ts.snap`), because v3 writes acknowledgments to *construct* metadata (`aws:cdk:acknowledged-rules`) instead. Task 1 depends on this being an expected snapshot delta rather than a regression.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Consumers still on cdk-nag v2 lose this construct's suppressions, because the `cdk_nag` template metadata disappears and v2 reads only that | High | Medium | Document explicitly in README + CHANGELOG (Task 3) that cdk-nag v3 is now required to consume the bundled acknowledgments |
| Harvested granular IDs (e.g. `AwsSolutions-IAM5[Resource::<generated-arn>]`) embed CDK-generated values, so a future `aws-cdk-lib` bump silently reintroduces violations | Medium | Medium | The un-skipped Task 2 test fails loudly on the next bump instead of failing silently — this is the intended trade-off, recorded here so it is not "fixed" by re-skipping the test |
| Peer floor `^2.263.0` forces every consumer to upgrade aws-cdk-lib | High | Low | Unavoidable — cdk-nag v3 requires >=2.257.0; note it in the CHANGELOG as a breaking change (Task 3) |

## Progress Tracking

- [x] Task 1: Bump toolchain to mvc-projen 0.0.30 / aws-cdk-lib 2.263.0 and migrate all 7 suppression sites so the build compiles
- [x] Task 2: Re-enable the cdk-nag test against the v3 API and refine acknowledgments to exact finding IDs
- [x] Task 3: Document the consumer-visible breaking changes
- [x] Task 4: Record the scope gaps discovered while harvesting (IAM4 upstream bug, new v3 rule categories, non-portable IDs)

## Implementation Tasks

### Task 1: Bump toolchain and migrate suppression call sites

**Objective:** Move the project onto mvc-projen 0.0.30, aws-cdk-lib 2.263.0, and cdk-nag 3.x, and translate all 7 `NagSuppressions` call sites to `Validations.of(construct).acknowledge(...)` so that `npm run build` succeeds again. These land together because cdk-nag v3 arrives with the mvc-projen bump and removes the `NagSuppressions` export outright — there is no compiling intermediate state. Acknowledgment IDs stay as the current bare rule IDs here; Task 2 makes the IAM ones effective.

**Files:**

- Modify: `.projenrc.ts`
- Modify: `src/rootmail.ts`
- Modify: `src/ses-receive.ts`
- Modify: `src/rootmail-autowire-dns.ts`
- Modify: `src/hosted-zone-dkim-propagation.ts`
- Modify: `src/hosted-zone-dkim-verification-records.ts`
- Modify: `src/ses-receipt-ruleset-activation.ts`
- Modify: `test/__snapshots__/rootmail.test.ts.snap` (regenerated)
- Modify: `test/__snapshots__/ses-receive.test.ts.snap` (regenerated)

**Key Decisions / Notes:**

- `.projenrc.ts`: set `cdkVersion: '2.263.0'` and change the `deps` entry `'constructs@^10.4.2'` → `'constructs@^10.5.1'`. Do **not** add a `cdk-nag@…` pin to `bundledDeps` — mvc-projen re-adds `cdk-nag@^3.0.1` unconditionally after user options (`node_modules/@mavogel/mvc-projen/lib/projects/cdk-construct.js:274-275`), so a pin there is silently overridden. Leave `'cdk-nag'` unversioned in `bundledDeps`.
- Run `npx projen` after editing `.projenrc.ts`; it regenerates `package.json`, `tsconfig.json`, `.projen/*`, and the workflows. `@aws-cdk/integ-runner` auto-caps at `2.203.0` and the alpha packages normalize to `2.263.0-alpha.0` — all three versions are confirmed published.
- Per call site: replace one `NagSuppressions.addResourceSuppressions([a, b, c], [r1, r2], true)` with one `Validations.of(construct).acknowledge({ id, reason })` call per (construct × rule) pair — so a 5-construct × 2-rule site becomes 10 calls. Reasons carry over verbatim. The `true` third argument drops (cascade is now implicit). Per-rule calls are used rather than a single batched call because that is the shape cdk-nag's own migration guide documents; do not pass an array (`acknowledge([r1, r2])` is not supported).
- Swap the import: drop `import { NagSuppressions } from 'cdk-nag';` and add `Validations` to the existing `aws-cdk-lib` import in each of the 6 files. `Aspects` imports in `src/rootmail.ts:168` and `src/ses-receive.ts:187` serve `ApplyDestroyPolicyAspect` and must stay.
- Snapshots will lose all 206 `Metadata.cdk_nag` blocks (see Assumptions). Regenerate with `npx projen test -- -u` and skim the diff to confirm the removals are confined to `cdk_nag` metadata plus routine CDK-version drift — a change to actual resource properties is a regression, not drift.

**Definition of Done:**

- [x] `grep -rn "NagSuppressions" src/ test/` returns nothing.
- [x] `npm ls aws-cdk-lib cdk-nag constructs` reports aws-cdk-lib 2.263.0, cdk-nag 3.x, constructs >=10.5.1.
- [x] `package.json` `peerDependencies.aws-cdk-lib` is `^2.263.0`.
- [x] Regenerated snapshot diff: `Properties` changes are limited to asset references (`S3Key`, `SourceHash`), CDK-managed runtime/handler defaults, and custom-resource-framework assets. Any change to a property this construct sets explicitly — bucket policy, SES receipt rule, SSM parameter, IAM statements — is a regression and must be investigated before proceeding.
- [x] Verify: `npm run build` exits 0 (jsii compile, eslint, and the full Jest suite all green).

### Task 2: Re-enable the cdk-nag test and refine acknowledgments to exact finding IDs

**Objective:** Rewrite `test/rootmail.test.ts`'s nag block against cdk-nag v3's validation-plugin API, remove the `describe.skip`, use its output to harvest the exact granular finding IDs the IAM4/IAM5 rules emit, and update the five affected source files so the report comes back clean. This is what converts Task 1's bare IAM acknowledgments from decorative into effective.

**Files:**

- Modify: `test/rootmail.test.ts`
- Modify: `src/ses-receive.ts`
- Modify: `src/rootmail-autowire-dns.ts`
- Modify: `src/hosted-zone-dkim-propagation.ts`
- Modify: `src/hosted-zone-dkim-verification-records.ts`
- Modify: `src/ses-receipt-ruleset-activation.ts`

**Key Decisions / Notes:**

- Replace the v2 registration + `Annotations.fromStack()` assertions entirely — v3 emits no CDK Annotations (`MIGRATION.md:196-203`). Build the stack, then call `new AwsSolutionsChecks(app, { verbose: true }).validateScope(stack)` and assert on the returned report's `violations`.
- Collapse the two v2 tests (`No unsuppressed Warnings` / `No unsuppressed Errors`) into a single assertion that `violations` is empty; v3 reports both severities in one array. Drop the now-unused `Annotations`, `Match`, and `Aspects` imports if nothing else in the file uses them.
- On failure, print `violations.map(v => ({ id: v.ruleName, paths: v.violatingResources.map(r => r.constructPath) }))`. Field names are confirmed: `PolicyViolation.ruleName` and `PolicyViolatingResource.constructPath` exist on aws-cdk-lib 2.263.0's `core/lib/validation/report.d.ts`, and cdk-nag populates both (`nag-pack.js:111-114`, `constructPath: params.node.node.path`). If the first run prints `undefined` anyway, fall back to `JSON.stringify(report.violations, null, 2)` before guessing IDs.
- Add one additional `Validations.of(construct).acknowledge({ id: 'AwsSolutions-IAM5[...]', reason })` call per harvested finding ID, reusing that rule's existing reason string verbatim.
- **Remove the bare `AwsSolutions-IAM4` / `AwsSolutions-IAM5` acknowledgments** once the granular ones are in place. They match nothing today, but if a future cdk-nag release changes either rule to return a plain `NagRuleCompliance` instead of a findings array, the bare ID would begin blanket-suppressing every IAM4/IAM5 finding on that construct — silently widening the security posture this plan declares out of scope to change.
- Do not suppress a finding that the harvest surfaces on a construct outside the Feature Inventory's 7 sites. A new construct showing IAM violations is a finding to report, not to silence.
- Once green, check the reverse direction too: every acknowledgment added must correspond to a finding that appeared in the pre-fix harvest. An acknowledgment that never matched anything means the construct list is wrong (e.g. `cr.Provider`'s internal tree changed shape across the 60-version bump, making a handler a child rather than a sibling) — flag it rather than leaving dead entries.
- **Deviation from the approved DoD, discovered during implementation (documented per spec-implement's "surprise discovery" handling):** the harvest surfaced two problems the plan did not anticipate, both confirmed against real code/issues, not assumed:
  1. **`AwsSolutions-IAM4[Policy::...]` is unacknowledgeable via the documented API at all.** aws-cdk-lib's `Validations.acknowledge()` (`qualifyId()`) throws `InvalidValidationId` for any id containing more than one `::`, and every AWS-managed-policy ARN contains one (`iam::aws:policy/...`). Confirmed as a currently-open upstream bug: cdklabs/cdk-nag#2359 and #2351. No IAM4 acknowledgment exists anywhere in `src/`.
  2. **Granular `Resource::<value>` IDs are not portable across consumer deployments.** They embed either a CDK-generated logical id (unique per construct-tree shape, differs for any consumer who instantiates `Rootmail` under a different construct id) or, for the SSM parameter finding, the literal test account/region (`us-east-1:1234`). Acknowledging these in `src/` would silently suppress nothing for a real consumer. Only the portable forms — `Resource::*` and literal `Action::<name>` — are acknowledged.
  3. The harvest also surfaced `AwsSolutions-L1` (nodejs18.x runtime deprecated), `AwsSolutions-SF1`/`SF2` (Step Functions logging/X-Ray on `cr.Provider`'s internal waiter state machine), and IAM4/IAM5 findings on the stack-level `LogRetention` singleton — none ever covered by the v2 suppressions (the v2 test was `describe.skip`ped, so these went unchecked). Out of scope for this plan; recorded as Task 4 follow-ups.
  User-approved resolution: acknowledge only the portable, non-buggy IAM5 IDs; leave the rest genuinely unacknowledged; scope the test's assertion to the addressable subset instead of the full `violations` array.

**Definition of Done:**

- [x] `test/rootmail.test.ts` contains no `describe.skip` and no reference to `Annotations` or `Aspects` for nag purposes.
- [x] ~~The nag test asserts an empty `violations` array~~ — superseded by the deviation above: the test filters `report.violations` down to the addressable subset (IAM4/IAM5, portable IDs, outside `LogRetention`) and asserts that subset is empty; the full array retains expected findings from categories out of this plan's scope (Task 4).
- [x] Every acknowledgment added traces to a construct listed in the Feature Inventory, and every one matched a finding in the pre-fix harvest (no dead entries).
- [x] No bare `AwsSolutions-IAM4` / `AwsSolutions-IAM5` acknowledgment remains in `src/`.
- [x] Verify: `npx projen test` exits 0 with the nag test executed (not skipped).

### Task 3: Document the consumer-visible breaking changes

**Objective:** Record in the repo's docs that consuming this construct now requires aws-cdk-lib >=2.263.0 and cdk-nag v3, and that the bundled suppressions no longer appear as `cdk_nag` metadata in synthesized CloudFormation templates. Without this, a consumer on cdk-nag v2 silently starts seeing IAM4/IAM5 violations from this construct's resources with no explanation.

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`

**Key Decisions / Notes:**

- README: state the new `aws-cdk-lib` peer floor and that cdk-nag v3 is required for the bundled acknowledgments to apply. Keep it to the requirements/installation area — do not restructure surrounding prose.
- `CLAUDE.md` "Security and Compliance" says "CDK Nag suppressions documented with justifications"; update the mechanism name to `Validations.of().acknowledge()` so the repo guidance matches the code.
- Skip `API.md` — `grep -c "cdk-nag" API.md` is 0 and jsii-docgen regenerates it during build anyway.
- No CHANGELOG edit: releases are generated from conventional commits by the release workflow, so the breaking-change note belongs in the commit message, not a hand-edited file.

**Definition of Done:**

- [x] README names the `aws-cdk-lib` >=2.263.0 requirement and the cdk-nag v3 dependency.
- [x] No doc in the repo describes the *current* suppression mechanism as `NagSuppressions` — the one exception is the README's Known Issues entry, which correctly names `NagSuppressions` as the old API being replaced (necessary context, not a stale reference).
- [x] Verify: `grep -n "Validations.of(construct).acknowledge" README.md CLAUDE.md` returns a match in both files, confirming the current API is documented, not just the old one removed.

### Task 4: Record the scope gaps discovered while harvesting

**Objective:** Capture, in the codebase itself (not only this plan file), the three categories of cdk-nag findings this migration deliberately leaves unaddressed, so they are discoverable without re-reading `docs/plans/`. Task 2's Key Decisions documents the discovery and reasoning; this task makes it durable and points at concrete next steps.

**Files:**

- Modify: `README.md`

**Key Decisions / Notes:**

- Add a short subsection near the cdk-nag note from Task 3 (not a new top-level section) listing: (1) `AwsSolutions-IAM4[Policy::...]` findings cannot be acknowledged — link cdklabs/cdk-nag#2359 and #2351 as the upstream bug to watch; (2) `AwsSolutions-L1`/`SF1`/`SF2` and `LogRetention`-singleton findings are pre-existing gaps never checked before this migration (the v2 test was skipped) and are out of this plan's scope; (3) granular `Resource::<logical-id>` findings cannot be portably suppressed by a shared construct library under cdk-nag v3 at all — consumers who run cdk-nag themselves will see them and may acknowledge locally if desired.
- Do not open GitHub issues or file anything against cdklabs/cdk-nag as part of this task — linking the existing upstream issues is sufficient; filing new ones is a repo-maintainer decision outside this plan.
- Trivial: single doc addition, no new branch/loop/error path, no new public symbol — covered by the Task 4 DoD's grep check rather than a test.

**Definition of Done:**

- [x] README documents all three categories above with the two upstream issue references.
- [x] Verify: `grep -n "cdk-nag#2359\|cdk-nag#2351" README.md` returns a match.
