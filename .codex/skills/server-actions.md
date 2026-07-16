# Server Actions Skill Guide

## Purpose

This guide explains how Server Actions should be used in EcoLink. Server Actions are the preferred mutation boundary for authenticated product workflows.

## Responsibilities

Server Actions are responsible for:

- Receiving form or action input.
- Authenticating the current user.
- Authorizing the requested operation.
- Validating input with Zod.
- Calling domain services.
- Persisting changes through Prisma.
- Returning typed outcomes to UI.

## Architecture Decisions

Server Actions should be small orchestrators. Complex business logic belongs in feature services. Side effects such as email and analytics should happen after successful persistence and should be idempotent where practical.

## Conventions

Every action should follow this order:

```text
authenticate -> authorize -> validate -> execute -> persist -> side effects -> return result
```

Return typed result shapes. Avoid throwing raw internal errors into UI. Log securely when needed, but do not expose stack traces.

## Best Practices

Use actions for:

- Create recycling request.
- Cancel recycling request.
- Schedule pickup.
- Confirm collection.
- Redeem reward.
- Submit organization verification.
- Publish education content.

Use Prisma transactions for related writes. Check ownership and role membership on the server even if the UI has already filtered actions.

## Examples

Reward redemption action concept:

```text
Authenticate user.
Validate reward offer ID.
Check reward is active.
Check user has enough points.
Create redemption.
Create ledger entry.
Return updated balance summary.
```

## Things To Avoid

- Mutations from Client Components directly to the database.
- Trusting hidden form fields for user identity or role.
- Returning untyped objects.
- Swallowing authorization failures.
- Sending emails before the database mutation succeeds.
- Mixing unrelated workflows into one action.
