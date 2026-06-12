# Project Structure

SquadCode is organized as an npm workspace. Keep frontend and backend changes in
their own app folders unless a change is truly shared.

```text
cdeda/
  package.json              Root workspace scripts
  package-lock.json         Locked dependency versions
  README.md                 Quickstart and setup notes
  docs/                     Project documentation

  apps/
    web/                    Frontend application
      index.html            Vite HTML entry
      package.json          Frontend scripts and dependencies
      tailwind.config.js    Frontend theme tokens
      src/
        App.tsx             Route registration
        main.tsx            React/Clerk/Vite bootstrap
        index.css           Global theme and base styles
        components/         Shared layout and UI components
          AppShell.tsx      Signed-in app shell and navigation
          ui/               Reusable Button/Card/Input/etc.
        lib/                Frontend helpers such as API client/title hook
        pages/              Route-level screens
        store/              Zustand client state
      public/               Browser-served static assets

    api/                    Backend application
      package.json          Backend scripts and dependencies
      prisma/
        schema.prisma       Database schema
        migrations/         Applied database migrations
      src/
        index.ts            Express server entry
        env.ts              Runtime config validation
        prisma.ts           Prisma client singleton
        auth/               Clerk auth and squad membership helpers
        http/               Express error/async helpers
        lib/                Backend utilities
        platforms/          Codeforces/LeetCode/GitHub integrations
        routes/             HTTP API route modules
        workers/            BullMQ queues and background jobs
```

## Where To Edit

- UI, pages, navigation, styling: `apps/web/src`
- API endpoints: `apps/api/src/routes`
- Database tables/models: `apps/api/prisma/schema.prisma`, then create a migration
- Background refresh/feed jobs: `apps/api/src/workers`
- Platform scraping/API logic: `apps/api/src/platforms`
- Project commands and workspace scripts: root `package.json`

## Common Commands

```powershell
npm run dev
npm --workspace apps/web run dev
npm --workspace apps/api run dev
npm run build
npm run typecheck
npm --workspace apps/api run db:migrate
```
