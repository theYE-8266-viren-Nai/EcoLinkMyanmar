# Deployment Skill Guide

## Purpose

This guide explains how EcoLink should be deployed and operated. EcoLink is expected to deploy on Vercel with managed services for authentication, database, storage, email, and analytics.

## Responsibilities

Deployment work is responsible for:

- Reliable Vercel builds.
- Safe environment variable configuration.
- Preview deployments.
- Production release confidence.
- Database migration safety.
- Integration health.
- Rollback awareness.

## Architecture Decisions

Vercel is the hosting platform for the Next.js application. Supabase hosts PostgreSQL and Storage. Clerk handles authentication. Resend handles email. PostHog handles analytics.

## Conventions

Use separate environment values for local, preview, and production. Production secrets must never be copied into public files or committed.

Before production deployment, run:

```text
type check
lint
tests for touched areas
build
migration review when schema changes
```

## Best Practices

Deploy database changes carefully. For breaking schema changes, use staged migrations. Confirm Clerk, Supabase, Resend, and PostHog environment variables are present in the target environment.

Use preview deployments for UI and workflow review. Monitor errors and analytics after production releases.

Document deployment-impacting changes in pull requests.

## Examples

Safe schema deployment:

```text
Add nullable column.
Deploy code that can read old and new shape.
Backfill data.
Make column required in later migration.
Remove old field after verification.
```

## Things To Avoid

- Deploying unreviewed migrations.
- Committing environment files.
- Depending on local-only secrets.
- Running production with preview webhook URLs.
- Making destructive schema changes in one step.
- Ignoring build warnings that indicate runtime incompatibility.
