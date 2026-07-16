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
