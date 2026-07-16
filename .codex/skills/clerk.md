# Clerk Skill Guide

## Purpose

This guide explains how Clerk authentication should be used in EcoLink. Clerk provides user authentication and session identity. EcoLink's own database provides domain profiles, roles, memberships, and permissions.

## Responsibilities

Clerk is responsible for:

- Sign-in and sign-up.
- Session management.
- Authenticated user identity.
- Auth UI where appropriate.
- Webhooks for user lifecycle events.

EcoLink is responsible for:

- User profiles.
- Organization memberships.
- Role-based authorization.
- Domain permissions.
- Audit trails.

## Architecture Decisions

Clerk identity must map to `UserProfile.clerkUserId`. Do not store authorization solely in Clerk metadata unless a documented integration requires it. The database should remain the source for organization roles and product permissions.

## Conventions

Server-side code should derive the current user from Clerk. Mutations should never accept a user ID as proof of identity.

Protected dashboard routes should enforce authentication at the server boundary. Protected actions must repeat authorization checks even when the UI hides unavailable actions.

## Best Practices

Use Clerk webhooks to create or sync user profiles when appropriate. Verify webhook signatures before processing. Keep Clerk secret keys server-only.

Design permission helpers around EcoLink concepts:

- Current user.
- Organization membership.
- Role.
- Requested action.
- Target entity.

## Examples

Authorization concept:

```text
User is authenticated by Clerk.
EcoLink loads the user's profile.
EcoLink checks whether the profile has an active organization membership.
EcoLink permits or denies the requested organization action.
```

## Things To Avoid

- Trusting user IDs from forms.
- Treating sign-in as authorization.
- Putting private Clerk secrets in client code.
- Using UI visibility as the only permission check.
- Creating custom password or session logic.
- Letting organization roles drift between Clerk metadata and the database.
