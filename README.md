This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This is a pnpm + Turborepo monorepo. **[`TOOLCHAIN.md`](./TOOLCHAIN.md) is the
authoritative reference** for versions, layout and commands; if anything below
disagrees with it, that file wins. Never run `npm install` here.

```bash
corepack enable
pnpm install   # or: make setup
pnpm dev       # or: make dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The Next.js app lives in `apps/web`; you can start editing the page by modifying
`apps/web/src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy on Google Cloud Run
Based on this guide: https://github.com/vercel/next.js/tree/canary/examples/with-docker

### Local Setup
1. Install Docker (https://docs.docker.com/get-started/get-docker/)
2. Install GCloud CLI (https://cloud.google.com/sdk/docs/install)
3. Sign in following `gcloud init` and use me@zheref.io credentials
4. Use project `radiant-galaxy-458917-i4`

### Deploy
