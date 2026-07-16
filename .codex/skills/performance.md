# Performance Skill Guide

## Purpose

This guide explains EcoLink's performance expectations. The product must feel responsive on modest devices and variable networks while supporting data-heavy dashboards and public content.

## Responsibilities

Performance work is responsible for:

- Fast route rendering.
- Small client bundles.
- Efficient database queries.
- Stable layouts.
- Responsive forms and dashboards.
- Scalable lists and reports.

## Architecture Decisions

EcoLink uses Server Components to reduce client JavaScript and keep data-heavy rendering on the server. Client Components should be limited to interactive areas. Growing lists must be paginated or virtualized when appropriate.

## Conventions

Use pagination for:

- Recycling requests.
- Pickups.
- Rewards.
- Notifications.
- Education content.
- Audit logs.
- Organization members.

Use skeletons for known layouts. Preserve dimensions during loading to avoid layout shift.

## Best Practices

Select only needed fields from Prisma. Add indexes for actual query patterns. Avoid N+1 queries. Cache public, low-change content when safe. Keep animation lightweight and avoid long-running dashboard effects.

Analyze Client Component boundaries before adding dependencies. A package used only on the server should not enter the client bundle.

## Examples

Good dashboard query thinking:

```text
Filter by organization ID and status.
Sort by scheduled time.
Return one page of records.
Select only fields shown in the table.
```

## Things To Avoid

- Rendering unbounded lists.
- Fetching entire records for small UI summaries.
- Making whole pages client-side.
- Loading heavy libraries for minor interactions.
- Layout shift during loading.
- Running analytics or email work before the main mutation completes.
