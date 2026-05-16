# SquadCode

Private-by-default squad dashboard for competitive programmers.

## Repo layout

- `apps/web`: React 18 + Vite + Tailwind
- `apps/api`: Express + PostgreSQL + Redis/Bull jobs (skeleton)

## Quickstart

1. Create `.env` from `.env.example`
2. Install deps: `npm install`
3. Start dev: `npm run dev`

## External setup (required)

### Clerk

Create a Clerk application and copy:
- `CLERK_SECRET_KEY` (backend)
- `VITE_CLERK_PUBLISHABLE_KEY` (frontend)

Set:
- `apps/api/.env`: `CLERK_SECRET_KEY=...`
- `apps/web/.env`: `VITE_CLERK_PUBLISHABLE_KEY=...`

### PostgreSQL

Provide a Postgres connection string as `DATABASE_URL` in `apps/api/.env`, then generate tables with:

`npm run db:migrate`

### Redis (optional but recommended)

If you set `REDIS_URL` in `apps/api/.env`, background jobs use BullMQ. Without Redis, refresh and cleanup run inline/in-process.

### GitHub token (optional)

`GITHUB_API_TOKEN` increases GitHub API rate limits for fetching `/users/:username`.
