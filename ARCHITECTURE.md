# EcoLink Architecture

## Purpose

This document defines the intended architecture for EcoLink. It explains how the application should be organized once application code is introduced, how data should flow through the system, and how new features should be added without creating long-term maintenance debt.

EcoLink is a multi-role platform connecting citizens, recycling organizations, NGOs, and businesses. The architecture must support public education, authenticated dashboards, recycling request workflows, reward systems, community engagement, organization verification, storage-backed media, analytics, and future reporting.

## Responsibilities

The architecture should:

- Keep product features independently understandable.
- Use Next.js Server Components as the default rendering model.
- Keep mutation logic behind Server Actions.
- Keep validation explicit with Zod.
- Keep persistence behind Prisma.
- Keep authentication and identity tied to Clerk.
- Keep file storage backed by Supabase Storage.
- Keep shared code purposeful and stable.

## Architecture Decision Summary

EcoLink will use a feature-first architecture. Routes compose features; features own domain behavior. Shared libraries provide infrastructure, not business shortcuts. This keeps high-change product areas isolated while allowing stable cross-cutting tools to be reused.

Primary decisions:

- Next.js App Router is the route and rendering foundation.
- Server Components are preferred for pages and data-heavy views.
- Client Components are used only for interactivity.
- Server Actions are the primary mutation boundary.
- Prisma is the only database access layer.
- Zod validates all external input.
- Clerk is the source of authentication identity.
- Supabase PostgreSQL stores relational data.
- Supabase Storage stores user and organization media.
- PostHog captures product analytics.
- Resend sends transactional email.

## Folder Structure

Recommended structure:

```text
src/
  app/
    (marketing)/
    (dashboard)/
    api/
  components/
    ui/
    layout/
    feedback/
  features/
    auth/
    recycling-requests/
    pickups/
    rewards/
    organizations/
    education/
    community/
    impact/
    admin/
  hooks/
  lib/
    auth/
    db/
    email/
    analytics/
    storage/
    config/
  styles/
  types/
prisma/
  schema.prisma
  migrations/
tests/
```

Routes in `src/app` should stay thin. They should coordinate layouts, metadata, and feature entry points. Feature modules should own the UI and behavior for their domain.

## Feature-First Architecture

Each feature should contain the code needed to understand that feature:

```text
src/features/rewards/
  actions/
  components/
  data/
  schemas/
  services/
  types/
  tests/
```

Responsibilities:

- `actions`: Server Actions for mutations.
- `components`: feature-specific UI.
- `data`: read queries and view model builders.
- `schemas`: Zod validation.
- `services`: business rules and orchestration.
- `types`: feature-specific public types.
- `tests`: focused tests for rules and actions.

Avoid reaching across feature internals. If `rewards` needs organization data, expose a small public function from `organizations` or use a shared data access helper intentionally.

## Server Components

Server Components are the default for:

- Pages.
- Layouts.
- Data-backed dashboard sections.
- Public educational content.
- Organization profiles.
- Impact summaries.

Server Components may call Prisma-backed query functions, read server-only config, and compose Client Components. They should not include client hooks, event handlers, or browser APIs.

Pass only necessary data to Client Components. Do not send private database records to the browser when the UI needs only display fields.

## Client Components

Use Client Components for:

- Forms.
- Dialogs and drawers.
- Dropdown menus and command menus.
- Optimistic interactions.
- Framer Motion animation.
- Browser APIs.
- Local interactive state.

Mark the smallest practical component with `"use client"`. Do not convert an entire route to a Client Component for one interactive control.

## Server Actions

Server Actions should be used for mutations such as:

- Creating recycling requests.
- Updating pickup status.
- Redeeming rewards.
- Creating education content.
- Verifying organizations.
- Upload metadata registration.
- Saving user preferences.

Each Server Action must follow this sequence:

1. Authenticate current user with Clerk.
2. Authorize the requested operation.
3. Validate input with Zod.
4. Execute business rules in a service.
5. Persist with Prisma.
6. Trigger side effects such as email or analytics after successful persistence.
7. Return a typed success or failure result.

Never trust IDs, roles, ownership, or reward values from the client.

## Shared Libraries

`src/lib` should hold infrastructure:

- `auth`: Clerk helpers and role resolution.
- `db`: Prisma client and transaction helpers.
- `storage`: Supabase Storage helpers.
- `email`: Resend client and templates.
- `analytics`: PostHog event helpers.
- `config`: typed environment configuration.

Shared libraries should not contain feature-specific business rules. A helper named `canUserRedeemReward` belongs in the rewards feature unless multiple domains use a generalized permission concept.

## Validation

Zod schemas should validate all incoming data:

- Form submissions.
- Server Action inputs.
- Route handler payloads.
- Search params where meaningful.
- Webhook bodies after signature verification.

Validation schemas should live near the feature they protect. Shared schemas are appropriate for cross-feature concepts such as pagination, IDs, file uploads, and address fields.

## Utilities

Utilities must be small, named by responsibility, and easy to test. Avoid broad `utils.ts` files. Prefer files like:

- `format-impact-weight.ts`
- `calculate-reward-points.ts`
- `normalize-phone-number.ts`
- `build-storage-path.ts`

Utilities should not hide database calls unless clearly named as data access.

## Hooks

Hooks are for client-side behavior. Keep hooks focused:

- `useDebouncedValue`
- `useMediaQuery`
- `useRewardRedemptionForm`
- `usePickupFilters`

Do not put server data fetching in client hooks unless there is a deliberate client-side data strategy. Prefer Server Components and Server Actions.

## Types

Types should reflect real contracts. Avoid exporting large database model types directly to UI code. Use view models for display needs.

Type categories:

- Database models: generated by Prisma.
- Input types: derived from Zod schemas.
- View models: shaped for UI display.
- Domain types: stable business concepts.
- Integration types: specific to Clerk, Supabase, Resend, or PostHog boundaries.

## Business Logic

Business logic belongs in feature services, not route files or components. Examples:

- Reward point calculation.
- Material eligibility.
- Recycling request status transitions.
- Organization verification rules.
- Pickup assignment constraints.
- Impact calculation.

Services should be testable without rendering UI. They may accept dependencies or run inside Prisma transactions for consistency.

## Data Flow

Read flow:

```text
Route -> Server Component -> feature data query -> Prisma -> view model -> UI
```

Mutation flow:

```text
Form -> Server Action -> auth -> Zod -> service -> Prisma -> side effects -> typed result -> UI state
```

File upload flow:

```text
Client selects file -> server validates intent -> signed upload or controlled upload path -> Supabase Storage -> Prisma metadata -> UI confirmation
```

Analytics flow:

```text
User action -> server/client event helper -> PostHog event with privacy-safe properties
```

## Authentication Flow

Clerk owns user authentication. EcoLink owns domain profiles and roles. Clerk user IDs should map to internal user profiles in the database.

Typical flow:

1. User signs in through Clerk.
2. Server reads Clerk identity.
3. App resolves EcoLink profile and role memberships.
4. Protected pages authorize access server-side.
5. Mutations repeat authorization regardless of UI visibility.

Do not rely on hidden buttons or client-side route guards as the only protection.

## Storage Flow

Supabase Storage should store:

- User avatars if not using Clerk-hosted avatars.
- Organization verification documents.
- Educational content images.
- Recycling request photos.
- Reward partner images.

Storage paths should be deterministic and scoped by entity type and owner where possible. Private files require signed URLs and server-side authorization.

## Dependency Rules

Allowed direction:

- Routes may depend on features and shared libraries.
- Features may depend on shared libraries and shared UI primitives.
- Shared libraries must not depend on features.
- Shared UI must not depend on domain features.
- Feature internals should not import another feature's private files.

Avoid circular dependencies. If two features need the same concept, extract the concept into a small shared domain module only when it is genuinely stable.

## Import Conventions

Use absolute imports once the project is configured. Recommended aliases:

```text
@/app
@/components
@/features
@/lib
@/hooks
@/types
```

Avoid deep imports into another feature's internals. Prefer public index files for intentionally exported feature APIs.

## Naming Conventions

Use domain language:

- `recyclingRequest`, not `requestData`.
- `pickupSlot`, not `timeItem`.
- `rewardLedgerEntry`, not `pointsRecord`.
- `organizationVerification`, not `approvalThing`.

Database models use PascalCase. Fields use camelCase. Routes use kebab-case. Component files use kebab-case or PascalCase consistently according to the final project convention.

## Adding New Features

When adding a feature:

1. Define the user and business outcome.
2. Identify the role permissions.
3. Add or update database models if required.
4. Create Zod schemas for input.
5. Create data queries and view models.
6. Create Server Actions for mutations.
7. Build UI using design system components.
8. Add loading, empty, error, and success states.
9. Add tests.
10. Update documentation if architecture or behavior changes.

## Things To Avoid

- Business logic in React components.
- Raw Prisma calls scattered across UI files.
- Client-side authorization as the only gate.
- Large shared utility folders.
- Premature global state.
- Deep feature-to-feature imports.
- Unvalidated search params or form data.
- Storage paths built from untrusted input.
