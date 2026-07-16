# Testing Skill Guide

## Purpose

This guide explains how EcoLink should be tested. Testing should protect the workflows that create trust: recycling requests, pickups, verification, rewards, education publishing, permissions, and impact records.

## Responsibilities

Testing is responsible for:

- Verifying business rules.
- Protecting authorization behavior.
- Checking validation schemas.
- Confirming Server Action outcomes.
- Covering critical UI states.
- Preventing regressions in data-sensitive workflows.

## Architecture Decisions

Test behavior rather than implementation details. Unit tests should cover pure business logic. Integration tests should cover actions and database-sensitive flows. UI tests should verify meaningful user-visible behavior.

## Conventions

Test names should describe expected behavior:

```text
rejects reward redemption when balance is too low
prevents organization viewer from approving pickup
requires at least one material category for recycling request
```

Use factories or builders for common domain records once the app exists. Keep test data readable.

## Best Practices

Prioritize tests for:

- Zod schemas.
- Permission helpers.
- Reward ledger logic.
- Status transitions.
- Organization verification.
- Server Actions.
- Components with complex states.

Avoid brittle snapshots. Prefer assertions about visible text, state changes, and persisted outcomes.

## Examples

Good action test scenario:

```text
Given an authenticated organization operator
And an assigned pickup
When the operator confirms collection
Then the request status changes
And reward ledger entries are created
And impact records are written
```

## Things To Avoid

- Testing only happy paths.
- Snapshot-heavy coverage.
- Tests that depend on execution order.
- Mocking away the behavior being tested.
- Ignoring authorization failures.
- Treating type checking as a substitute for runtime tests.
