<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EcoLink App Workflow

When working inside `ecolink/`, follow the repository rules in the parent `AGENTS.md` first, then apply these local checks:

1. Use `npm` as the default package manager for this app.
2. Run `npm run lint`.
3. Run `npx tsc --noEmit`.
4. Run focused tests when the touched area has test coverage or the change affects business-critical behavior.
5. Run `npx -y react-doctor@latest . --verbose --diff` after React or Next.js changes.
6. Run `npm run build` before handoff for broad or production-relevant changes.

## SPA and Hackathon Rules

- Keep dashboard interactions inside one client-side SPA surface when they do not need a URL, server render, or permission boundary.
- Do not reintroduce `middleware.ts` or `proxy.ts`; protected pages and APIs must call their own server-side auth checks.
- Prefer a thin page wrapper for authentication and a focused client component for tabs, filters, and view state.
- Keep first-load JavaScript small: import icons/components directly, avoid barrel imports, and dynamically load heavy integrations such as maps.
- Design every demo path with loading, empty, error, and offline/external-service fallback states.
- Use deterministic fixtures only behind an explicit demo mode and label them as demo data.
- Keep the hackathon critical path testable without Clerk, Supabase, OpenRouter, or network access by injecting small function dependencies at test boundaries.
- Do not trade away authorization, input validation, secret handling, or accessibility to make a demo faster.

## Yangon Map Product Rule

For waste-density mapping in Yangon, use zoom-aware layers: heatmap at far zoom, hexbin density at medium zoom, and clustered report markers at close zoom. Keep layer changes performant, legend-labeled, accessible, and privacy-aware.
