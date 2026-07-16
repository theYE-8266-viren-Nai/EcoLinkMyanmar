# EcoLink Agent Operating Guide

## Purpose

This file is the permanent operating guide for any AI coding agent working in the EcoLink repository. Treat it as the repository-level system prompt. Its job is to keep future work consistent, maintainable, accessible, secure, and aligned with EcoLink's mission: helping citizens turn waste into worth through responsible recycling, rewards, education, and community engagement.

EcoLink is expected to be built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Clerk, Prisma, Supabase PostgreSQL, Supabase Storage, React Hook Form, Zod, Resend, PostHog, and Vercel. Do not introduce a competing framework, authentication provider, database ORM, form stack, analytics system, or hosting platform without a written architecture decision.

## Responsibilities

Every agent must:

- Preserve the feature-first architecture documented in `ARCHITECTURE.md`.
- Follow the design system in `DESIGN.md`.
- Model data according to `DATABASE.md`.
- Build only features that support the product direction in `PRODUCT.md`.
- Use the approved technology choices and constraints in `STACK.md`.
- Enforce the universal engineering rules in `RULES.md`.
- Read the relevant `.codex/skills/*.md` file before working in that area.

Agents should leave the repository easier to understand than they found it. That means small, typed, well-named changes; clear ownership boundaries; and tests for meaningful behavior.

## Coding Philosophy

EcoLink favors boring, reliable engineering over cleverness. Prefer explicit code, clear boundaries, and predictable data flow. Optimize for a future senior engineer opening the project after six months away and immediately understanding the intent.

Use composition before abstraction. Extract shared code only when duplication has proven itself across real use cases or when a domain concept is clearly reusable. Avoid creating generic helpers that hide important behavior.

Keep user trust at the center. Recycling pickups, rewards, organization verification, impact reporting, and personal data all require accuracy. A polished interface cannot compensate for unclear states, insecure data access, or unreliable records.

## Engineering Standards

All production code must be:

- Type-safe, with no `any` unless a short comment explains why no safer type is possible.
- Validated at trust boundaries with Zod.
- Accessible by default, including keyboard navigation, semantic HTML, visible focus states, and meaningful labels.
- Secure by default, with server-side authorization checks for every protected operation.
- Observable enough to debug production behavior without exposing private user data.
- Covered by focused tests when behavior, permissions, data transformations, or user flows are involved.

All changes should be scoped to the requested feature or fix. Do not mix feature work with broad refactors, dependency churn, formatting-only rewrites, or unrelated cleanup.

## Feature Implementation

Implement features vertically. A feature should own its UI, server actions, validation schemas, supporting components, tests, and documentation notes where appropriate.

Recommended feature shape:

```text
src/features/recycling-requests/
  actions/
  components/
  data/
  schemas/
  types/
  utils/
  tests/
```

Use shared folders only for stable primitives and cross-feature concerns. A component used by one feature belongs inside that feature. A component used by several unrelated features may move to `src/components`.

When adding a feature:

1. Confirm the user journey in `PRODUCT.md`.
2. Confirm the data model in `DATABASE.md`.
3. Define validation schemas before writing mutations.
4. Build server-side access checks before client UI polish.
5. Add loading, empty, error, and success states.
6. Add tests around authorization, validation, and core outcomes.
7. Update documentation if the feature changes architecture, product behavior, or data contracts.

## File Organization

Prefer this top-level structure when the application is introduced:

```text
src/
  app/
  components/
  features/
  lib/
  hooks/
  types/
  config/
  styles/
prisma/
public/
tests/
```

Use `src/app` for Next.js routes, layouts, route handlers, and metadata. Keep route files thin. Route files should compose feature modules, not contain deep business logic.

Use `src/lib` for infrastructure concerns such as Prisma client setup, Clerk helpers, Supabase clients, Resend integration, PostHog utilities, and reusable server-only helpers.

Use `src/types` sparingly. Prefer colocated feature types unless the type truly crosses the whole application.

## Code Quality Rules

Names should describe domain intent. Prefer `RecyclingRequest`, `RewardLedgerEntry`, `OrganizationVerification`, and `PickupSlot` over vague names such as `Item`, `Data`, `Record`, or `Entry`.

Functions should do one thing. If a function validates input, checks permissions, performs a mutation, emits analytics, and sends email, split it into clear units with a small orchestrating function.

Avoid hidden side effects in utilities. Utilities should be deterministic unless their name clearly signals external work, such as `sendPickupConfirmedEmail`.

Do not duplicate business rules. Reward calculations, eligibility checks, request status transitions, and organization permissions must live in one well-named place and be reused.

## Type Safety

TypeScript should be strict. Avoid weakening the compiler to move quickly. Use inferred types where they improve readability, and explicit types where they document a public contract.

Validation schemas should define input contracts. Derive TypeScript types from Zod schemas when the validated input type is reused. Keep database types, form input types, and view model types separate when they represent different concerns.

Never trust client-provided user IDs, organization IDs, role names, prices, reward amounts, or status values. Derive identity and authorization from Clerk on the server.

## Performance Expectations

Prefer Server Components for data-heavy views and dashboards. Fetch only the fields required by the UI. Use pagination for lists that can grow: requests, rewards, education posts, organization activity, notifications, and audit logs.

Avoid loading large client bundles for static content. Client Components should be used for interactivity, forms, optimistic updates, animations, and browser-only APIs.

Images should use Next.js image optimization where appropriate. Supabase Storage assets should have predictable public/private access patterns and size constraints.

Avoid unnecessary re-renders by keeping Client Component state local and minimal. Do not move entire pages to the client for one interactive control.

## Accessibility Requirements

EcoLink serves citizens, organizations, NGOs, and businesses with varying devices, bandwidth, and abilities. Accessibility is a product requirement, not a polish task.

Every interactive element must be reachable by keyboard and have a clear accessible name. Forms must associate labels, helper text, and error text with controls. Color must never be the only way to convey status. Motion must respect reduced-motion preferences.

All dashboard tables, cards, filters, modals, menus, and toasts must be usable with screen readers. Test keyboard flows before shipping.

## Testing Expectations

Testing should match risk. At minimum:

- Zod schemas should have tests for accepted and rejected inputs when they encode business-critical validation.
- Server Actions should test authorization, validation failures, and successful outcomes.
- Business logic should be unit tested without the UI.
- Components with non-trivial states should be tested for visible behavior.
- Critical user journeys should have integration or end-to-end coverage once the app exists.

Do not write snapshot tests as a substitute for behavior. Prefer tests that explain what matters.

## Development Pipeline

Agents should use the `ecolink/` application as the execution root for day-to-day development work. Treat `npm` as the default package manager because `ecolink/package-lock.json` is the canonical lockfile in this repository.

Run this pipeline in order whenever you change application code, configuration, or dependencies:

1. Sync dependencies only when required, using `npm install` inside `ecolink/` after `package.json` or lockfile changes.
2. Run `npm run lint` inside `ecolink/`.
3. Run `npx tsc --noEmit` inside `ecolink/`.
4. Run focused tests for the touched feature when tests exist or when the change affects validation, permissions, domain rules, or stateful UI.
5. Run `npx -y react-doctor@latest . --verbose --diff` inside `ecolink/` after React, Next.js, Client Component, Server Component, hook, or rendering changes.
6. Run `npm run build` inside `ecolink/` for route, configuration, dependency, environment, metadata, or production behavior changes, and before handoff when the impact is broad.

If one step is not applicable, say why in the handoff. Do not claim completion while skipping a relevant validation step.

## Git Workflow

Keep commits focused and readable. A good commit changes one coherent thing. Do not include generated artifacts, local environment files, dependency lockfile changes, or formatting churn unless they are required for the work.

Before committing, run the relevant checks:

- `npm run lint` in `ecolink/`.
- `npx tsc --noEmit` in `ecolink/`.
- Focused tests related to touched areas.
- `npx -y react-doctor@latest . --verbose --diff` in `ecolink/` when React or Next.js code changed.
- `npm run build` in `ecolink/` for routing, configuration, dependency, or broad production-impact changes.

Never rewrite user work or discard uncommitted changes unless explicitly instructed.

## Component Organization

Use Server Components by default. A component should become a Client Component only when it uses state, effects, event handlers, browser APIs, client-side form behavior, animation hooks, or interactive UI libraries that require the client.

Component naming conventions:

- `FeatureNamePageContent` for route-level composition.
- `FeatureNameList`, `FeatureNameCard`, `FeatureNameTable` for domain UI.
- `CreateFeatureNameForm` for forms.
- `FeatureNameEmptyState`, `FeatureNameErrorState`, `FeatureNameSkeleton` for states.

Extract a component when:

- The parent becomes difficult to scan.
- The UI block has a distinct responsibility.
- The same UI appears in more than one place.
- The component has its own loading, error, or permission state.

Do not extract a component solely to reduce line count if it hides context and has no reusable meaning.

## Server Component Rules

Server Components may fetch data, read server-only environment variables through typed configuration, and compose Client Components. They must not include event handlers, browser APIs, or client-only hooks.

Keep data fetching close to the route or feature boundary. Convert database records into view models before sending them into Client Components when the raw data includes sensitive fields or unnecessary internal details.

## Server Action Rules

Server Actions are the preferred mutation boundary for form submissions and small workflow actions. Every Server Action must:

- Run on the server.
- Authenticate the current user through Clerk.
- Authorize the action against the relevant user, organization, or role.
- Validate input with Zod.
- Use Prisma for database writes.
- Return a typed result shape that the UI can handle.
- Avoid leaking stack traces, secrets, or internal IDs in user-facing errors.

Server Actions should call domain services for complex business logic. Do not bury reward rules, pickup assignment logic, or verification policy inside a route file.

## Reusable Code

Reusable code should be extracted when it represents a stable concept:

- Design primitives belong in shared UI.
- Domain rules belong in feature services.
- Infrastructure clients belong in `src/lib`.
- Validation schemas belong near the feature they protect.
- Cross-feature schemas belong in a shared domain folder only after multiple features use them.

Avoid catch-all files such as `helpers.ts`, `utils.ts`, or `constants.ts` at broad scopes. Prefer names that communicate responsibility, such as `reward-calculation.ts`, `pickup-status.ts`, or `organization-permissions.ts`.

## Things To Avoid

- Do not generate application code before the project is intentionally scaffolded.
- Do not use `any` to silence TypeScript.
- Do not bypass Zod validation.
- Do not trust client-side authorization.
- Do not expose Supabase service role keys, Clerk secrets, Resend keys, or PostHog secrets.
- Do not duplicate design tokens outside the Tailwind/theme layer.
- Do not create large Client Components for mostly static views.
- Do not add new dependencies without clear value and maintenance justification.
- Do not create generic abstractions before EcoLink has real patterns.

## Definition Of Done

A change is done when it is implemented, typed, validated, accessible, tested at the appropriate level, consistent with the design system, checked through the required development pipeline, and documented if it changes long-term project knowledge. The user should be able to continue from the repository state without needing hidden context from the conversation.

## Hackathon Delivery Rules

When building a hackathon slice, optimize for a believable end-to-end user journey that can be demonstrated from a clean checkout:

- Prefer one focused SPA surface for interactive product flows. Use client state for tabs and local view changes; do not create a new server route for every panel.
- Do not add Next middleware or proxy files for convenience. Authenticate and authorize protected pages, Server Actions, and API routes at their own boundaries.
- Keep the first demo path short: landing screen, one primary action, visible result, and a useful recovery state.
- Use realistic seeded/demo data behind an explicit demo flag. Never silently fake production data or hide unavailable integrations.
- Build graceful fallbacks for maps, AI, payments, email, and storage so the main demo remains usable when an external service is unavailable.
- Keep API contracts stable and documented. Return actionable user-safe errors and log diagnostic details only on the server.
- Validate all external input with Zod at the boundary. Never trust browser state for identity, permissions, rewards, or impact totals.
- Avoid speculative abstractions and dependency churn. Prefer a small vertical slice with focused tests over broad unfinished infrastructure.
- Every interactive control needs a keyboard path, an accessible name, a visible loading state, an empty state, and an error state.
- Before handoff, run lint, TypeScript, focused tests, a production build, and the React Doctor check for React/Next changes.
- Document shortcuts and known limitations in feature notes so judging and follow-up work are not based on hidden assumptions.

## Yangon Waste-Density Map Knowledge

The primary geographic target is Yangon. Waste-density visualization must change with zoom level so the map remains useful at city, township, and report-detail scales:

- Far zoom: show a heatmap that communicates broad waste-density hotspots across Yangon.
- Medium zoom: show a hexbin density map to compare concentration between neighborhoods without marker overlap.
- Close zoom: show clustered report markers that can expand into individual reports as the user zooms further.
- Keep the zoom transitions visually continuous and explain the active layer with an accessible map legend.
- Use aggregated counts for far and medium zoom levels; only expose report-level details at close zoom with the appropriate privacy and authorization checks.
