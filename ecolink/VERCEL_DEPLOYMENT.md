# EcoLink Vercel Deployment

## Delivery Modes

EcoLink has two explicit modes:

- `NEXT_PUBLIC_ECOLINK_DEMO_MODE=true` keeps the hackathon data in browser storage and enables the public `ECO-STAFF` demo flow.
- `NEXT_PUBLIC_ECOLINK_DEMO_MODE=false` requires Supabase Auth and sends point and reward mutations through center-scoped database functions.

Do not use the shared `ECO-STAFF` code as production authentication.

## 1. Apply Supabase Changes

From `ecolink/`, link the intended project and apply the migration:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates recycling centers, staff assignments, verified drop-offs, the point ledger, partner rewards, reward claims, notifications, RLS policies, and atomic RPCs.

Load the seed data from `supabase/seed.sql` in the Supabase SQL editor or with the local reset workflow. The seed contains five Yangon centers and four illustrative rewards.

## 2. Create Auth Users

Create separate citizen and staff users in Supabase Auth. Ensure each has a row in `public.profiles`, then run the two commented assignment statements at the bottom of `supabase/seed.sql` after replacing the example emails.

The citizen profile receives member code `ECO-MM-1048`. The staff profile is assigned to Hlaing EcoPoint. A staff account can only call point and fulfillment RPCs for that assigned center.

## 3. Configure Vercel

Set these variables for Production, Preview, and Development as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
GEMINI_API_KEY
AI_SCANNER_MODEL=gemini-3.1-flash-lite
AI_SCANNER_MAX_UPLOAD_MB=10
NEXT_PUBLIC_ECOLINK_DEMO_MODE=false
```

`GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.

In Supabase Auth URL configuration, add the Vercel production domain and required preview callback domains. Confirm that email templates point back to the deployed `/auth/confirm` flow before enabling public sign-up.

## 4. Verify Before Production

Run:

```powershell
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Then verify:

1. Citizen can analyze an image without exposing the Gemini key.
2. Citizen can submit a report and reserve a reward.
3. Hlaing staff can add points for `ECO-MM-1048`.
4. The same staff account cannot write a different center's records.
5. Reward claims can only be fulfilled by their assigned center.
6. New notifications appear after point and reward events.

## Operational Notes

- Partner names, stock, and community funding shown in demo mode are illustrative.
- The map uses OpenStreetMap tiles and attribution. Review tile usage expectations before high-volume launch.
- Apply rate limiting to Gemini and report endpoints before opening anonymous traffic.
- Rotate any key that has been pasted into chat, committed, or exposed to a browser bundle.
