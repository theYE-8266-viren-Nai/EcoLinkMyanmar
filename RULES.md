# EcoLink Engineering Rules

## Purpose

This document defines universal engineering rules for EcoLink. These rules apply to all application code, documentation updates, tests, database work, UI work, and infrastructure changes. They exist to keep EcoLink safe, maintainable, accessible, and aligned across human and AI contributors.

## Responsibilities

Every contributor is responsible for:

- Preserving type safety.
- Validating data at trust boundaries.
- Keeping components and files understandable.
- Preventing duplicated business logic.
- Respecting user privacy and platform security.
- Shipping accessible, tested workflows.
- Updating documentation when long-term decisions change.

## Universal Rules

### Never Use `any`

Do not use `any` to bypass TypeScript. If an external boundary truly cannot be typed, prefer `unknown` and narrow it. A rare `any` requires a short comment explaining why no safer option is possible.

### Never Duplicate Logic

Business rules must have one source of truth. Reward calculations, status transitions, organization permissions, file path rules, and material eligibility should live in named services or utilities and be reused.

### Keep Components Small

Components should be easy to scan. As guidance:

- Shared UI primitive: under 150 lines.
- Feature component: under 250 lines.
- Route page: under 150 lines.
- Complex form: split when sections have distinct responsibilities.

These are guidelines, not excuses for unnatural fragmentation. Extract by responsibility, not line count alone.

### Prefer Composition

Build pages by composing focused components. Avoid monolithic components that own fetching, permissions, mutation logic, layout, and form behavior all at once.

### Prefer Server Components

Use Server Components by default. Use Client Components only for browser-only behavior, local state, event handlers, forms, animation, or interactive primitives.

### Always Validate Input

Every external input must be validated:

- Form data.
- Server Action payloads.
- Route handler bodies.
- Search params.
- Webhook payloads after signature verification.
- File metadata.

TypeScript does not replace runtime validation.

### Use Zod

Use Zod for validation. Keep schemas near the feature they protect. Derive input types from schemas when useful.

### Use Prisma

Use Prisma for database access and migrations. Do not introduce another ORM or scatter raw SQL through the codebase. Raw SQL requires a documented reason and must be parameterized.

### Use Clerk

Use Clerk for authentication. Never build custom authentication. Use EcoLink database roles and memberships for authorization.

### Never Expose Secrets

Secrets must stay server-side:

- Clerk secret keys.
- Supabase service role keys.
- Database URLs.
- Resend API keys.
- PostHog server secrets.
- Webhook signing secrets.

Client-visible environment variables must be intentionally public and prefixed according to framework conventions.

## File Size Rules

Recommended maximums:

- Component file: 250 lines.
- Page file: 150 lines.
- Server Action file: 250 lines.
- Service file: 300 lines.
- Schema file: 250 lines.
- Test file: 350 lines.

Refactor when a file has multiple reasons to change, mixes layers, or requires too much scrolling to understand.

## Page Rules

Page files should:

- Read params and search params.
- Compose layout and feature entry components.
- Set metadata where appropriate.
- Defer data fetching and business logic to feature modules when complexity grows.

Page files should not contain:

- Complex Prisma queries.
- Long form implementations.
- Business rule branching.
- Authorization logic beyond simple route gating.

## Component Rules

Components should:

- Have clear names.
- Accept explicit props.
- Keep state local.
- Render accessible markup.
- Include loading, empty, error, and success states where applicable.

Components should not:

- Fetch unrelated data.
- Perform hidden mutations.
- Import Prisma.
- Duplicate domain rules.
- Depend on another feature's private internals.

## Server Action Rules

Every Server Action must:

- Authenticate the current user.
- Authorize the operation.
- Validate input with Zod.
- Use Prisma for persistence.
- Return a typed result.
- Avoid leaking internal errors.
- Trigger side effects only after successful state changes.

Server Actions should be small orchestrators. Move complex rules into services.

## Form Rules

Forms should use React Hook Form and Zod. Every field needs a visible label. Errors must be field-specific when possible. Submit buttons must show pending state. Server errors must be presented clearly and accessibly.

Do not rely only on placeholders. Do not duplicate validation rules between client and server; share schemas or schema intent.

## Database Rules

Database changes must:

- Use Prisma migrations.
- Include indexes for expected query paths.
- Preserve data during deploy.
- Use enums for controlled states.
- Use audit fields where accountability matters.
- Use soft delete for user-facing historical records when appropriate.

Never mutate immutable history such as reward ledger entries or audit logs. Use compensating records.

## Authorization Rules

Authentication answers "who is this user?" Authorization answers "what may this user do?" Both are required.

Every protected operation must check authorization on the server. UI visibility is not security. Organization permissions must derive from memberships and roles, not client-provided role names.

## Performance Rules

Performance expectations:

- Fetch only needed fields.
- Paginate growing lists.
- Avoid N+1 queries.
- Keep Client Components small.
- Avoid unnecessary global state.
- Use stable dimensions for cards, tables, and loading states.
- Do not ship large client libraries for server-only work.

## Accessibility Rules

Every shipped interface must:

- Be keyboard navigable.
- Use semantic HTML.
- Provide visible focus states.
- Associate labels and errors with inputs.
- Provide accessible names for icon buttons.
- Avoid color-only status indicators.
- Respect reduced-motion preferences.

Accessibility defects are product defects.

## Security Rules

Security requirements:

- Validate all input.
- Authorize all protected server work.
- Keep secrets out of client bundles.
- Use private storage for sensitive documents.
- Avoid logging personal data unnecessarily.
- Sanitize or safely render user-generated content.
- Verify webhooks before processing.
- Use least-privilege access patterns.

## Testing Rules

Test behavior, not implementation details. Add tests for:

- Business rules.
- Validation schemas.
- Authorization logic.
- Server Actions.
- Critical UI states.
- Database-sensitive workflows.

Do not use snapshot tests as the main proof of correctness. Avoid brittle tests that fail on harmless markup changes.

## When To Refactor

Refactor when:

- A file has multiple unrelated responsibilities.
- A rule is duplicated.
- A component is hard to scan.
- A service cannot be tested without too much setup.
- A feature imports another feature's private internals.
- New functionality would make the existing shape worse.

Do not refactor unrelated areas during focused feature work.

## Review Rules

Code review should check:

- Correctness.
- Authorization.
- Validation.
- Type safety.
- Accessibility.
- Performance.
- Test coverage.
- Consistency with EcoLink documentation.
- Clear naming and maintainability.

Review comments should be specific and tied to user or system risk.

## Definition Of Done

A change is done when:

- It satisfies the requested behavior.
- It follows the architecture and design system.
- Inputs are validated.
- Protected actions are authorized.
- Types are strict.
- Tests cover meaningful risk.
- Accessibility states are handled.
- Performance is reasonable.
- Documentation is updated when lasting project knowledge changes.

## Things To Avoid

- `any`.
- Client-only authorization.
- Duplicate reward or status logic.
- Raw SQL as a default.
- Secret exposure.
- Giant components.
- Generic utility dumping grounds.
- Unbounded lists.
- Placeholder-only forms.
- Overly broad dependencies.
- Documentation drift.
