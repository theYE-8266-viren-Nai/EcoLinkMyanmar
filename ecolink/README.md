EcoLink Myanmar is a Next.js product for recyclability guidance, Yangon partner-center discovery, community reporting, verified recycling points, notifications, and partner rewards.

Demo routes:

- `/` citizen impact dashboard
- `/recycle` Gemini-assisted recyclability analyzer and center map
- `/report` environmental issue reporting
- `/rewards` reward redemption and cleanup contributions
- `/admin` center-scoped staff portal

Demo credentials:

```text
Staff code: ECO-STAFF
Member code: ECO-MM-1048
```

See `VERCEL_DEPLOYMENT.md` for Supabase, Gemini, and Vercel production setup.

Production authentication uses Clerk. Supabase trusts Clerk session tokens through its Third-Party Auth integration, while center assignments and all staff authorization remain enforced in PostgreSQL.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
