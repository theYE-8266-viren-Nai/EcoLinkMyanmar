# UI Skill Guide

## Purpose

This guide explains how EcoLink UI should be designed and implemented. The interface should feel trustworthy, modern, efficient, and specific to recycling, rewards, education, and community impact.

## Responsibilities

UI is responsible for:

- Communicating product state clearly.
- Supporting efficient workflows.
- Providing accessible controls.
- Applying the design system consistently.
- Handling loading, empty, error, success, disabled, and pending states.
- Making role-specific dashboards understandable.

## Architecture Decisions

EcoLink builds UI with React, Tailwind CSS v4, shadcn/ui, and lucide-style icons. UI should follow `DESIGN.md`. Dashboards should be operational and calm; marketing pages may be more visual but must still show real product value.

## Conventions

Use icons in tool buttons where appropriate. Use text labels for primary commands. Use badges for statuses. Use tables for dense operational lists on desktop and cards or compact rows on mobile.

State components should be named consistently:

```text
FeatureEmptyState
FeatureErrorState
FeatureSkeleton
FeatureStatusBadge
```

## Best Practices

Make the next action obvious. A citizen with no recycling requests should see how to create one. An organization with pending requests should see filters and assignment actions. An admin reviewing verification should see evidence, decision controls, and audit context.

Use color meaningfully:

- Green: positive action or confirmed impact.
- Amber: warning, pending, reward emphasis.
- Blue: verification, trust, links.
- Rose: destructive or critical.

## Examples

Dashboard page structure:

```text
Header with title and primary action
Summary metrics
Filters
Main list or table
Detail drawer or modal
```

## Things To Avoid

- Marketing-style cards everywhere in dashboards.
- Nested cards.
- Unlabeled icon buttons.
- Color-only statuses.
- Oversized hero typography in tool surfaces.
- UI text that explains obvious interface mechanics instead of product value.
