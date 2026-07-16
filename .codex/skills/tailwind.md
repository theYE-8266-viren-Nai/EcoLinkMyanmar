# Tailwind CSS Skill Guide

## Purpose

This guide explains how Tailwind CSS v4 should be used in EcoLink. Tailwind is the styling layer for the design system, component variants, responsive layouts, and visual states.

## Responsibilities

Tailwind is responsible for:

- Applying design tokens.
- Supporting responsive layouts.
- Styling shadcn/ui components.
- Creating consistent states.
- Keeping CSS close to UI components.

## Architecture Decisions

EcoLink uses Tailwind as the primary styling method. Global CSS should define tokens, base styles, and theme variables. Component-level styling should use Tailwind classes and variants.

The interface must not become a one-note green product. Use neutral structure and reserve color for meaning.

## Conventions

Use token-based classes for:

- Backgrounds.
- Text.
- Borders.
- Rings.
- Muted surfaces.
- Destructive states.
- Primary and secondary actions.

Avoid arbitrary values unless the design system does not provide a suitable token and the value is intentionally specific.

## Best Practices

Keep class lists readable. If a class list becomes difficult to scan, extract a component, use a variant helper, or create a design primitive.

Use responsive classes intentionally. Design mobile first, then enhance for larger screens.

Use stable dimensions for fixed-format UI such as cards, icons, tables, counters, and skeletons to avoid layout shift.

## Examples

Good styling intent:

```text
primary action button -> primary background, primary foreground, visible focus ring
status badge -> color tied to status meaning
dashboard surface -> neutral background, subtle border, compact spacing
```

## Things To Avoid

- Random hex colors in components.
- Arbitrary spacing everywhere.
- Huge class strings hiding repeated UI patterns.
- Using color as the only status indicator.
- Layouts that work only at desktop width.
- Decorative gradients as the default visual language.
