# Next.js Skill Guide

## Purpose

This guide explains how Next.js 16 should be used in EcoLink. Next.js is the application framework for routing, rendering, Server Components, Server Actions, metadata, route handlers, and Vercel deployment.

## Responsibilities

Next.js is responsible for:

- App Router route structure.
- Server-first rendering.
- Layout composition.
- Route-level metadata.
- Server Actions for mutations.
- Route handlers for webhooks and integration endpoints.
- Performance boundaries between server and client code.

## Architecture Decisions

EcoLink uses the App Router only. Do not introduce the legacy Pages Router. Pages and layouts should be Server Components by default. Route files should compose feature modules and avoid containing deep business logic.

Recommended route groups:

```text
src/app/(marketing)/
src/app/(dashboard)/
src/app/api/
```

Marketing routes serve public pages. Dashboard routes require authentication and role-aware navigation. API routes are reserved for webhooks, external integrations, or cases where Server Actions are not appropriate.

## Conventions

- Use kebab-case route segments.
- Keep `page` files thin.
- Put shared shell UI in `layout` files.
- Use `loading` files for route-level loading states.
- Use `error` files for route-level recoverable errors.
- Use `not-found` files for missing public or protected resources.
- Use metadata APIs for public SEO-sensitive pages.

## Best Practices

Prefer data fetching in Server Components or feature data functions called by Server Components. Pass clean view models to Client Components rather than raw database records.

Use Server Actions for form submissions and workflow mutations such as creating recycling requests, scheduling pickups, redeeming rewards, or verifying organizations.

Use route handlers for Clerk webhooks, PostHog integration callbacks, Resend webhooks, or signed upload flows when a request/response API is required.

## Examples

Good route responsibility:

```text
app/(dashboard)/requests/page.tsx
  -> renders RecyclingRequestsPage from the feature module
```

Avoid putting request filtering, Prisma queries, and status transition logic directly in the route file.

## Things To Avoid

- Pages Router patterns.
- Client-rendering entire pages for one interactive element.
- Business logic in `page` or `layout` files.
- Unvalidated search params.
- Route handlers for mutations that would be simpler and safer as Server Actions.
- Exposing server-only environment variables to client components.
