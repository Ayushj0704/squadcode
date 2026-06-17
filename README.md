# SquadCode

Private-by-default squad dashboard for competitive programmers.

## Repo layout

- `apps/web`: React 18 + Vite + Tailwind frontend
- `apps/api`: Express + Prisma + PostgreSQL + Redis/BullMQ backend
- `packages/shared`: Shared types and constants
- `packages/tsconfig`: Shared TypeScript configurations
- `docs`: project notes, folder map, and maintenance docs


`GITHUB_API_TOKEN` increases GitHub API rate limits for fetching `/users/:username`.
