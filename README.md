<p align="center">
  <img src="./apps/web/public/logo.png" alt="SquadCode Logo" width="120px" height="120px" style="border-radius: 20%;" />
</p>


<p align="center">
  <a href="https://readme-typing-svg.demolab.com?font=Outfit&size=24&duration=3000&pause=1000&color=00F2FE&center=true&vCenter=true&width=600&lines=Collaborative+Competitive+Programming;Real-Time+Solve+Activity+Feeds;Monaco-powered+Code+Playground;Interactive+Contest+Threads+via+SSE">
    <img src="https://readme-typing-svg.demolab.com?font=Outfit&size=24&duration=3000&pause=1000&color=00F2FE&center=true&vCenter=true&width=600&lines=Collaborative+Competitive+Programming;Real-Time+Solve+Activity+Feeds;Monaco-powered+Code+Playground;Interactive+Contest+Threads+via+SSE" alt="Typing SVG" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge&logo=github&logoColor=white&color=00F2FE" alt="Status" />
  <img src="https://img.shields.io/badge/Frontend-Netlify-00AD9F?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify" />
  <img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
  <img src="https://img.shields.io/badge/Run-Judge0-E33E3B?style=for-the-badge&logo=fastapi&logoColor=white" alt="Judge0" />
</p>

---

# 🚀 SquadCode

**SquadCode** is a private-by-default, collaborative dashboard and environment designed specifically for competitive programming squads. It aggregates metrics from **Codeforces**, **LeetCode**, and **GitHub** to provide interactive dashboards, live activity tracking, team contest discussion boards, and an integrated sandboxed playground.

### 🌐 Live Environments
*   **Web Frontend:** [https://squadcode.netlify.app](https://squadcode.netlify.app)
*   **API Service:** [https://squadcode.onrender.com](https://squadcode.onrender.com)

---

## ⚡ Main Highlights

*   📅 **Unified Coding Analytics:** Visualizes LeetCode difficulties solved, Codeforces ratings, and GitHub contributions in a consolidated view.
*   🔔 **Real-Time Live Activity Feed:** Real-time feed fetching updates every 5 minutes from LeetCode & Codeforces platforms, pushing instant updates to all squad members.
*   💬 **Contest Threads (SSE-Backed):** Live discussion rooms synced in real-time using Server-Sent Events (SSE) with sound alerts on new incoming messages.
*   🎮 **Integrated Playground:** Sandboxed programming playground utilising the VS Code Monaco Editor engine. Compiles and executes C++ and Python 3 codes remotely through the **Judge0 API**, complete with custom `stdin` support.
*   👥 **Squad Management:** Admin controls, invite codes, members directory, custom member nicknames, and simple squad creation.

---

## 📦 Workspace Repository Layout

This project is configured as a Monorepo using **NPM Workspaces** to allow effortless configuration, dependency, and type sharing:

```text
cdeda/
├── package.json              <-- Workspace configuration and scripts
├── tsconfig.json             <-- TypeScript workspace root setup
├── docs/                     <-- Architectural details and project structures
│   ├── PROJECT_STRUCTURE.md  <-- Folder structure definitions
│   └── architecture_overview.md
├── apps/
│   ├── web/                  <-- React 18 + Vite + Tailwind CSS Frontend
│   │   ├── src/
│   │   │   ├── App.tsx       <-- Application entry & routes
│   │   │   ├── components/   <-- UI wrappers & layout files
│   │   │   ├── lib/          <-- SSE adapters, Client APIs, notifications
│   │   │   └── pages/        <-- Views (Dashboard, Leaderboard, Playground, etc.)
│   │   └── package.json
│   └── api/                  <-- Express.js + Prisma ORM + Postgres Backend
│       ├── prisma/           <-- Prisma migrations and relational database schema
│       ├── src/
│       │   ├── index.ts      <-- Node web-server bootstrap
│       │   ├── routes/       <-- API endpoints (squads, execute, threads, feed)
│       │   └── workers/      <-- Polling workers for LeetCode & Codeforces
│       └── package.json
└── packages/
    ├── shared/               <-- Reusable data definitions and constant guards
    └── tsconfig/             <-- Central TypeScript templates
```

### 🔗 File Reference Links
*   🚀 Frontend Entry: [apps/web/src/App.tsx](file:///C:/Users/piyus/OneDrive/Pictures/Documents/Desktop/cdeda/apps/web/src/App.tsx)
*   ⚙️ Backend Entry: [apps/api/src/index.ts](file:///C:/Users/piyus/OneDrive/Pictures/Documents/Desktop/cdeda/apps/api/src/index.ts)
*   💾 DB Schema: [apps/api/prisma/schema.prisma](file:///C:/Users/piyus/OneDrive/Pictures/Documents/Desktop/cdeda/apps/api/prisma/schema.prisma)

---

## 🛠️ Technology Stack

| Layer | Technology | Usage Description |
| :--- | :--- | :--- |
| **Frontend** | **React 18** | Virtual DOM rendering & Component architecture |
| **Build & Tooling** | **Vite** | Hyperfast module bundling and hot reloading |
| **Styling** | **Tailwind CSS v3** | Modern utility-first theme system |
| **State** | **Zustand** | Performant, lightweight client-side state manager |
| **Backend** | **Express.js v5** | API routing, HTTP middleware & SSE streams |
| **Language** | **TypeScript** | System-wide type-safe constraints |
| **Database** | **PostgreSQL (Supabase)** | SQL persistent storage with PgBouncer connectivity |
| **ORM** | **Prisma** | Database migrations and programmatic relational query builder |
| **Security / Auth**| **Clerk** | Secure JWT user logins and profile syncing |
| **Code Exec** | **Judge0 API** | Remote secure sandbox compilation of C++ and Python codes |

---

## 🏗️ Architecture & Data Pipelines

### Relational Database Model
The relational structure mapped with PostgreSQL (Supabase) and Prisma:

```mermaid
erDiagram
    User ||--o{ SquadMember : belongs_to
    Squad ||--o{ SquadMember : contains
    User ||--o{ PlatformConnection : connects
    User ||--o{ ContestThread : creates
    User ||--o{ ThreadPost : writes
    Squad ||--o{ ContestThread : manages
    ContestThread ||--o{ ThreadPost : aggregates
    Squad ||--o{ ActivityFeed : broadcasts
    User ||--o{ ActivityFeed : generates
    PracticeSheet ||--o{ SheetProblem : registers
    SheetProblem ||--o{ ProblemCompletion : logs

    User {
        string id PK
        string clerkId
        string username
        string email
        datetime createdAt
    }
    Squad {
        string id PK
        string name
        string inviteCode
        string createdById FK
        datetime createdAt
    }
    SquadMember {
        string id PK
        string squadId FK
        string userId FK
        string role
        string nickname
    }
    PlatformConnection {
        string id PK
        string userId FK
        string platform
        string username
        boolean verified
    }
    ContestThread {
        string id PK
        string squadId FK
        string title
        string platform
        string createdById FK
    }
```

### SSE Real-Time Communication pipeline
```mermaid
sequenceDiagram
    participant WebClient as Frontend Client
    participant Server as Express API Server
    participant DB as Supabase PostgreSQL
    participant CF_LC as Codeforces & LeetCode APIs

    WebClient->>Server: Subscribe to Event Stream (GET /api/threads/events/stream)
    Server-->>WebClient: Acknowledge stream (SSE headers, keep-alive)
    
    rect rgba(0, 242, 254, 0.05)
        Note over Server, CF_LC: Background Work (Every 5 mins)
        Server->>CF_LC: Query user profile handles for new submits
        CF_LC-->>Server: Return lists of submissions
        Server->>DB: Write diff of new solved problems to activity feed
    end

    WebClient->>Server: Send new discussion message (POST /api/threads/:id/posts)
    Server->>DB: Persist post entry to Database
    Server->>WebClient: Emit SSE notifications & play alert sounds
```

---

## ⚙️ Development Environment Setup

### 1. Repository Installation
Clone this repository and verify dependencies at the workspace root:
```powershell
# Clone the repository
git clone https://github.com/Ayushj0704/squadcode.git
cd squadcode

# Install all workspace dependencies
npm install
```

### 2. Configure Environment Variables
You need to configure two environment configurations.

#### Backend Configuration: Create [apps/api/.env](file:///C:/Users/piyus/OneDrive/Pictures/Documents/Desktop/cdeda/apps/api/.env)
```env
# Supabase PostgreSQL Connection Configurations
DATABASE_URL="postgresql://postgres:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Clerk Authentication credentials
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."

# Node Configuration
PORT=8080
FRONTEND_URL="http://localhost:5173"

# GitHub API (Optional: to increase API rate limits for requests)
GITHUB_API_TOKEN="ghp_..."
```

#### Frontend Configuration: Create [apps/web/.env](file:///C:/Users/piyus/OneDrive/Pictures/Documents/Desktop/cdeda/apps/web/.env)
```env
# Clerk API keys
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."

# Backend API Endpoint URL
VITE_API_URL="http://localhost:8080"
```

### 3. Database Migration
Deploy schema tables to your database instance:
```powershell
npm run db:generate
npm run db:migrate
```

---

## 🏃 Running Applications

You can launch both the frontend client and the backend API server concurrently from the root directory using the predefined script:

```powershell
# Start both apps concurrently
npm run dev
```

Alternatively, to run the services separately:

```powershell
# Start Vite Frontend (default port: 5173)
npm run dev:web

# Start Express server with auto-watch (default port: 8080)
npm run dev:api
```

---

## 📡 Key API Routes

All endpoints listed require header authentication with a valid Clerk JWT: `Authorization: Bearer <clerk_token>`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/squads/mine` | Retrieves all squads the authenticated user belongs to. |
| **POST** | `/api/squads` | Create a new squad. Request body: `{ name, description }`. |
| **POST** | `/api/squads/join` | Join a squad via a secret code. Request body: `{ inviteCode }`. |
| **GET** | `/api/squads/:id/dashboard` | Aggregates and returns stats for competitive programming profiles. |
| **GET** | `/api/feed/:squadId` | Fetches the recent platform solve history for a squad. |
| **POST** | `/api/execute` | Compiles and executes code via Judge0. Body: `{ language, code, stdin }`. |
| **GET** | `/api/threads/events/stream` | Opens a real-time SSE stream for new post alerts. |

---

## 🎨 Design & Code Formatting
*   Codebase formatting rules are enforced via **ESLint** and **Prettier** packages.
*   Run the linter and TypeScript validations prior to committing code:
```powershell
npm run lint:all
npm run typecheck:all
```
