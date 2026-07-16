# Accessibility Skill Guide

## Purpose

This guide explains EcoLink's accessibility requirements. EcoLink must be usable by people with different abilities, devices, languages, and levels of technical confidence.

## Responsibilities

Accessibility is responsible for:

- Keyboard access.
- Screen reader support.
- Semantic structure.
- Visible focus states.
- Color contrast.
- Reduced-motion support.
- Clear forms and errors.
- Understandable status updates.

## Architecture Decisions

Accessibility is a baseline requirement for every UI feature. shadcn/ui primitives should be used for complex interactive components because they provide strong accessible behavior when preserved.

## Conventions

Every page should have clear landmarks and heading order. Every input needs a visible label. Every icon-only button needs an accessible name. Status badges need text, not only color.

Modals and drawers must manage focus. Toasts should not be the only place critical information appears.

## Best Practices

Test keyboard navigation manually for forms, menus, dialogs, tabs, filters, tables, and drawers. Ensure focus returns to the trigger after closing overlays.

Use plain language in errors:

```text
Choose at least one material category.
Enter a pickup address before scheduling.
This reward is no longer available.
```

Respect `prefers-reduced-motion` for animations and transitions.

## Examples

Accessible status pattern:

```text
Badge text: Scheduled
Color: Blue
Optional icon: Calendar
Screen reader gets the word "Scheduled"
```

## Things To Avoid

- Clickable `div` elements.
- Placeholder-only labels.
- Color-only error or status states.
- Focus traps that cannot be escaped.
- Modals without titles.
- Toast-only validation feedback.
- Animations that ignore reduced-motion preferences.
