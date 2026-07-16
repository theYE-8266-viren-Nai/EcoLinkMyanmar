# shadcn/ui Skill Guide

## Purpose

This guide explains how shadcn/ui should be used in EcoLink. shadcn/ui provides accessible, composable primitives that EcoLink owns directly in the repository.

## Responsibilities

shadcn/ui is responsible for:

- Buttons.
- Inputs.
- Forms.
- Dialogs.
- Drawers.
- Dropdowns.
- Tables.
- Tabs.
- Toasts.
- Badges.
- Menus and command interfaces.

## Architecture Decisions

EcoLink uses shadcn/ui as the base component system, customized through the EcoLink design tokens in `DESIGN.md`. Domain components should be built on top of shadcn primitives instead of replacing them with unrelated UI libraries.

## Conventions

Keep primitive components in a shared UI folder. Build domain components in features.

Examples:

```text
components/ui/button
features/rewards/components/reward-offer-card
features/organizations/components/organization-verification-dialog
```

Use variants consistently. A destructive button should look the same whether it appears in admin, rewards, or pickup workflows.

## Best Practices

Preserve accessibility behavior when customizing components. Dialogs must manage focus. Menus must support keyboard navigation. Inputs must connect labels and errors.

Use icon buttons only when they have accessible labels and tooltips where useful.

Prefer composition over changing primitives for one feature-specific need. If a feature needs special behavior, wrap the primitive in a feature component.

## Examples

Use a shared `Button` primitive for:

- Scheduling a pickup.
- Redeeming a reward.
- Saving organization settings.
- Publishing education content.

Then use feature wrappers when copy, state, or permissions differ.

## Things To Avoid

- Installing another component library for common primitives.
- Breaking keyboard support during styling.
- Forking primitives casually.
- Building custom modals from scratch.
- Unlabeled icon buttons.
- Mixing inconsistent button and input styles across features.
