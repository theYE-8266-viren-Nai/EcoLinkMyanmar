# Prisma Skill Guide

## Purpose

This guide explains how Prisma should be used in EcoLink. Prisma is the only application ORM and migration tool for Supabase PostgreSQL.

## Responsibilities

Prisma is responsible for:

- Schema definition.
- Type-safe database access.
- Migrations.
- Transactions.
- Query modeling.
- Relationship handling.

## Architecture Decisions

EcoLink uses Prisma for all relational application data. Do not add a second ORM. Raw SQL is acceptable only when Prisma cannot express a required operation and the reason is documented.

## Conventions

Models use PascalCase. Fields use camelCase. Enums use uppercase snake case values. Use explicit relation names when relationships would otherwise be ambiguous.

Database access should live in feature data functions or services, not React components.

## Best Practices

Select only fields needed by the UI. Use transactions for multi-step mutations such as completing a pickup, creating reward ledger entries, and writing impact records.

Avoid N+1 queries by using appropriate includes, selects, batching, or query restructuring.

Use migrations for schema changes. Never edit a committed production migration. For risky changes, deploy in stages: nullable field, backfill, code adoption, required constraint.

## Examples

Good Prisma usage concept:

```text
Server Action validates input.
Service starts transaction.
Request status is updated.
Reward ledger entry is created.
Impact record is written.
Transaction commits.
```

This keeps related state changes consistent.

## Things To Avoid

- Prisma calls in Client Components.
- Full record selection when only a few fields are needed.
- Updating immutable reward ledger history.
- Free-form string statuses instead of enums.
- Direct SQL for routine CRUD.
- Schema changes without migration review.
