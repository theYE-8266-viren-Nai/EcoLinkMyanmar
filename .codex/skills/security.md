# Security Skill Guide

## Purpose

This guide explains EcoLink's security expectations. EcoLink handles user profiles, addresses, organization records, verification documents, reward balances, pickup data, and analytics. Security failures would directly damage user trust.

## Responsibilities

Security is responsible for:

- Authentication.
- Authorization.
- Input validation.
- Secret protection.
- Private file access.
- Safe analytics.
- Webhook verification.
- Audit logging.

## Architecture Decisions

Clerk handles authentication. EcoLink's database handles domain authorization. Prisma handles database access. Supabase Storage private files require server-authorized signed URLs. Zod validates inputs.

## Conventions

Every protected server operation must authenticate and authorize. Never trust client-provided user IDs, roles, organization IDs, reward values, status values, or file paths.

Secrets must be read only on the server and never logged.

## Best Practices

Validate all inputs with Zod. Verify webhook signatures before processing. Use Prisma transactions for sensitive multi-step operations. Record audit logs for admin actions, verification decisions, permission changes, and reward adjustments.

Use least privilege for integrations. Keep analytics privacy-safe by avoiding personal details in event properties.

## Examples

Secure verification document access:

```text
User requests document.
Server authenticates user.
Server checks admin or organization permission.
Server creates short-lived signed URL.
Client receives URL only after authorization.
```

## Things To Avoid

- Client-side authorization as the only gate.
- Public buckets for sensitive documents.
- Logging secrets or private user data.
- Processing unsigned webhooks.
- Raw SQL with string interpolation.
- Reward mutations without ledger/audit records.
- Broad admin checks when organization-scoped checks are required.
