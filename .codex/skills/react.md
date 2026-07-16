# React Skill Guide

## Purpose

This guide explains how React 19 should be used in EcoLink. React powers the user interface for citizens, organizations, NGOs, businesses, and administrators. The UI must be reliable, accessible, and easy to maintain.

## Responsibilities

React is responsible for:

- Component composition.
- Server and Client Component boundaries.
- Local interactive state.
- Form UI integration.
- Dashboard and public page rendering.
- Accessible stateful interface behavior.

## Architecture Decisions

EcoLink uses Server Components by default. Client Components are used only when needed for state, events, forms, effects, browser APIs, Framer Motion, or interactive shadcn/ui primitives.

Components should represent domain concepts or reusable UI primitives. Avoid anonymous blocks of UI repeated across pages.

## Conventions

Component names should be specific:

- `RecyclingRequestCard`
- `PickupStatusBadge`
- `RewardRedemptionForm`
- `OrganizationVerificationDrawer`
- `EducationContentList`

Props should be explicit and narrow. Prefer view models shaped for the component over passing full database records.

## Best Practices

Keep state as close as possible to where it is used. Avoid global state unless several distant parts of the app need synchronized client state and server rendering cannot solve the problem.

Use composition for layout. A parent should orchestrate, while children own focused display or interaction responsibilities.

Render all meaningful states:

- Loading.
- Empty.
- Error.
- Success.
- Disabled.
- Pending.

Use semantic HTML first. A button should be a `button`, not a clickable `div`.

## Examples

Good component split:

```text
RecyclingRequestsPage
RecyclingRequestFilters
RecyclingRequestTable
RecyclingRequestEmptyState
RecyclingRequestStatusBadge
```

This keeps data, filtering, table display, and state feedback understandable.

## Things To Avoid

- Large components with unrelated responsibilities.
- Effects for data that can be loaded on the server.
- Passing sensitive database records into Client Components.
- Click handlers on non-interactive elements.
- Prop names like `data`, `item`, or `thing` when a domain name exists.
- Client-side authorization as a security boundary.
