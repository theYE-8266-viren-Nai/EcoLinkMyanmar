# EcoLink Technology Stack

## Purpose

This document explains the approved technology stack for EcoLink, why each tool was chosen, how the tools integrate, and what constraints future work must respect. Any major replacement requires a written architecture decision and migration plan.

EcoLink's stack is optimized for a modern, type-safe, server-rendered web application with strong authentication, relational data, file storage, forms, analytics, email, and Vercel deployment.

## Responsibilities

The stack should provide:

- Product velocity without sacrificing maintainability.
- Strong type safety across UI, validation, and persistence.
- Secure authentication and authorization foundations.
- Reliable database access and migrations.
- Accessible, consistent UI.
- Production observability and deployment confidence.

## Next.js 16

Why chosen:

Next.js is the application framework for routing, rendering, Server Components, Server Actions, metadata, and deployment alignment with Vercel. Version 16 is the expected baseline for this repository.

Alternatives considered:

- Remix: strong web fundamentals but less aligned with React Server Components and Vercel conventions.
- Astro: excellent content sites, less suitable for complex authenticated dashboards.
- Pure Vite React: flexible but would require more routing, server, and deployment architecture.

Integration:

Next.js App Router owns route structure. Server Components fetch data through feature data functions. Server Actions perform mutations. Route handlers may support webhooks or integration endpoints.

Best practices:

- Prefer Server Components.
- Keep route files thin.
- Use layouts for shared navigation and shells.
- Use metadata APIs for public pages.
- Avoid route-level business logic.

Version constraints:

Use Next.js 16 APIs and patterns. Do not depend on deprecated Pages Router conventions.

## React 19

Why chosen:

React 19 supports the component model EcoLink needs, including modern server/client composition and improved action-oriented workflows.

Alternatives considered:

- Vue or Svelte: excellent frameworks but not aligned with the chosen Next.js and shadcn ecosystem.

Integration:

React powers all UI. Server Components render default views, while Client Components handle forms, dialogs, filters, and motion.

Best practices:

- Keep components small and purpose-named.
- Prefer composition.
- Keep state local.
- Avoid unnecessary effects.
- Use controlled forms only where needed.

## TypeScript

Why chosen:

EcoLink requires reliable domain modeling, role checks, data transformations, and validated workflows. TypeScript reduces ambiguity and protects future contributors.

Alternatives considered:

- JavaScript: faster to start but too risky for this domain.

Integration:

TypeScript spans application code, validation types, Supabase database types, component props, actions, and test utilities.

Best practices:

- Use strict mode.
- Avoid `any`.
- Derive input types from Zod.
- Separate database types from view models.
- Prefer explicit public contracts.

## Tailwind CSS v4

Why chosen:

Tailwind provides fast, token-driven styling that works well with shadcn/ui and modern design systems. Version 4 is the expected styling baseline.

Alternatives considered:

- CSS Modules: strong isolation but slower for design-system iteration.
- Styled Components: runtime overhead and less aligned with Server Components.
- Vanilla Extract: powerful but more setup.

Integration:

Tailwind tokens should represent EcoLink's color, spacing, radius, and motion decisions. shadcn/ui components should be styled through Tailwind classes and theme variables.

Best practices:

- Use design tokens instead of one-off colors.
- Keep class lists readable.
- Extract components for repeated UI patterns.
- Avoid arbitrary values unless justified.

## shadcn/ui

Why chosen:

shadcn/ui provides accessible, composable UI primitives that can be owned directly in the repository. It fits EcoLink's need for professional dashboards and forms.

Alternatives considered:

- Material UI: comprehensive but visually opinionated and heavier.
- Chakra UI: productive but less aligned with Tailwind v4 conventions.
- Building from scratch: too slow and risky for accessibility.

Integration:

Use shadcn components as the base for buttons, inputs, dialogs, dropdowns, tables, tabs, toasts, and forms. Customize tokens to match EcoLink's design system.

Best practices:

- Keep primitives accessible.
- Avoid modifying generated components casually.
- Build domain components on top of primitives.
- Use consistent variants.

## Supabase Authentication

Why chosen:

Supabase Auth provides authentication, session management, and JWT claims that integrate directly with Supabase PostgreSQL Row Level Security.

Alternatives considered:

- Auth.js: flexible but requires more ownership.
- Clerk: strong user-management tooling but duplicates the Supabase identity layer needed for RLS.
- Custom auth: not acceptable for this project.

Integration:

Supabase Auth is the source of authentication identity. EcoLink maps `auth.users.id` to `UserProfile.authUserId` and domain roles through organization memberships.

Best practices:

- Authenticate on the server.
- Authorize with EcoLink domain roles.
- Never trust client-provided user IDs.
- Keep Supabase service-role keys server-only.

## Supabase PostgreSQL

Why chosen:

PostgreSQL is reliable for relational domain data, auditing, querying, and future reporting. Supabase provides managed Postgres plus storage in a developer-friendly platform.

Alternatives considered:

- Neon: excellent Postgres hosting but would require separate storage.
- PlanetScale: strong MySQL platform but less ideal for Postgres-specific needs.
- Firebase: fast but less suited to relational workflows and auditability.

Integration:

Application reads and writes use typed Supabase clients against Supabase PostgreSQL. Row Level Security is part of the application authorization model, not only a database hardening layer.

Best practices:

- Use Supabase migrations.
- Index for real query paths.
- Put schema SQL and RLS policy SQL in migrations.
- Keep connection management aligned with Vercel runtime constraints.

## Supabase Storage

Why chosen:

EcoLink needs storage for request photos, verification documents, reward images, organization logos, and education media. Supabase Storage integrates with the selected data platform.

Alternatives considered:

- S3/R2: powerful but additional platform complexity.
- Cloudinary: strong media tools but less necessary initially.

Integration:

Store file metadata in PostgreSQL through Supabase where needed. Store binary files in Supabase Storage. Use private buckets for sensitive documents.

Best practices:

- Validate file type and size.
- Use deterministic paths.
- Use signed URLs for private files.
- Never expose service role keys to the client.

## Supabase Client Libraries

Why chosen:

Supabase client libraries provide typed database access, storage, and auth session propagation that works with PostgreSQL Row Level Security.

Alternatives considered:

- Prisma: strong schema-first ORM, but it bypasses Supabase RLS unless carefully paired with JWT-aware connections.
- Drizzle: excellent and lightweight, but less directly integrated with Supabase Auth and generated API types.
- Kysely: flexible SQL builder but more manual schema management.
- Raw SQL: too error-prone as the default.

Integration:

Supabase migrations own schema and RLS. Feature data functions and services use typed Supabase clients for database reads and writes.

Best practices:

- Keep queries scoped.
- Use transactions for multi-step mutations.
- Avoid N+1 query patterns.
- Do not leak database rows directly into Client Components when sensitive.

## React Hook Form

Why chosen:

React Hook Form provides performant form state management and integrates well with Zod and shadcn/ui form components.

Alternatives considered:

- Formik: mature but heavier.
- Plain React state: acceptable for tiny forms but inconsistent for complex workflows.

Integration:

Use React Hook Form in Client Components. Use Zod schemas as validation contracts and Server Actions as submission boundaries.

Best practices:

- Use field-level errors.
- Keep forms accessible.
- Avoid duplicating validation rules.
- Preserve form state during recoverable errors.

## Zod

Why chosen:

Zod gives runtime validation and TypeScript type inference. EcoLink needs runtime validation at every trust boundary.

Alternatives considered:

- Yup: mature but weaker TypeScript ergonomics.
- Valibot: small and fast, but Zod is widely understood.

Integration:

Zod validates forms, Server Action inputs, route payloads, search params, and webhook payloads after signature checks.

Best practices:

- Keep schemas near features.
- Use clear error messages.
- Derive input types where useful.
- Do not rely on TypeScript alone for runtime safety.

## Framer Motion

Why chosen:

Framer Motion provides polished UI transitions for forms, dashboards, modals, and reward feedback.

Alternatives considered:

- CSS-only motion: good for simple cases but less powerful.
- React Spring: flexible but more complex for common UI transitions.

Integration:

Use in Client Components only. Keep motion purposeful and respect reduced-motion preferences.

Best practices:

- Animate opacity and transform.
- Keep durations short.
- Avoid decorative loops in dashboards.
- Do not let motion block task completion.

## Resend

Why chosen:

Resend provides developer-friendly transactional email delivery. EcoLink needs emails for pickup updates, verification outcomes, reward redemptions, and campaign notifications.

Alternatives considered:

- SendGrid: mature but heavier operational experience.
- Postmark: excellent transactional mail, also acceptable if requirements change.

Integration:

Server-side email helpers call Resend after successful database state changes. Email templates should avoid exposing sensitive data.

Best practices:

- Send after persistence.
- Use idempotency for important emails where possible.
- Keep templates accessible and concise.
- Never send secrets.

## PostHog

Why chosen:

PostHog provides product analytics for activation, recycling request completion, reward redemption, education engagement, and organization workflows.

Alternatives considered:

- Google Analytics: less product-event focused.
- Plausible: privacy-friendly but lighter on product analytics.
- Segment: powerful but more infrastructure.

Integration:

Use privacy-safe event helpers. Track product behavior, not unnecessary personal details.

Best practices:

- Define event names consistently.
- Avoid sensitive properties.
- Capture role and workflow context carefully.
- Use analytics to improve product decisions, not to replace logs.

## Vercel

Why chosen:

Vercel is the deployment platform best aligned with Next.js. It supports previews, production deployments, environment variables, and performance monitoring.

Alternatives considered:

- Netlify: strong platform but less optimized for Next.js.
- Fly.io or Render: flexible but more infrastructure ownership.
- Self-hosting: unnecessary complexity initially.

Integration:

Vercel hosts the Next.js application. Supabase, Resend, and PostHog remain managed external services.

Best practices:

- Use preview deployments for review.
- Keep environment variables scoped.
- Validate builds before production.
- Monitor runtime and edge compatibility for libraries.

## Architecture Decisions

The stack deliberately separates responsibilities:

- Supabase handles authentication.
- EcoLink database handles domain authorization and profiles.
- Supabase handles relational persistence.
- Supabase Storage handles files.
- Server Actions handle mutations.
- Zod handles runtime validation.
- shadcn/ui and Tailwind handle interface consistency.
- PostHog handles product analytics.
- Resend handles transactional email.
- Vercel handles deployment.

## Things To Avoid

- Adding a second ORM.
- Adding a second auth provider.
- Writing direct database access outside typed Supabase helpers without a documented reason.
- Treating Supabase Storage as public by default.
- Using analytics for private data.
- Adding UI libraries that conflict with shadcn/ui.
- Introducing global client state before the need is proven.
