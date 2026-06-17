# SquadCode: Architecture & Tech Stack Breakdown

This document provides a clear, interview-ready breakdown of the technologies used in your project and how they work together.

---

## 1. Are we still using Prisma?
**Yes, absolutely!** 
To understand why, it helps to know the difference between a Database and an ORM (Object-Relational Mapper):
*   **Supabase (PostgreSQL):** This is the actual database where your data lives (tables, rows, columns).
*   **Prisma:** This is the tool inside your Node.js code that *talks* to the database. Instead of writing raw, messy SQL strings like `SELECT * FROM users WHERE id = 1`, Prisma lets you write clean TypeScript like `prisma.user.findUnique(...)`. 

Prisma is the bridge between your Express.js server and your Supabase database.

---

## 2. The Tech Stack (What you are using)

Your project uses a modern, highly-scalable **PERN-like stack** (PostgreSQL, Express, React, Node) with some modern upgrades.

### **Frontend (Client-Side)**
*   **React 18:** The core UI library used to build interactive components.
*   **Vite:** The build tool. It is much faster than Create React App (CRA) and provides instant server starts and lightning-fast hot module replacement.
*   **Tailwind CSS:** A utility-first CSS framework used for styling the app quickly without leaving the HTML/JSX.
*   **Zustand:** A small, fast state management library (used in `squadStore` and `notificationStore`). It is simpler and less boilerplate-heavy than Redux.
*   **React Router:** For navigating between different pages (Dashboard, Playground, etc.) without reloading the browser.

### **Backend (Server-Side)**
*   **Node.js & Express.js (v5):** The runtime and web framework handling incoming HTTP requests, routing them, and sending back JSON responses.
*   **TypeScript:** Used across the entire stack (Frontend + Backend) to ensure type safety, catch bugs early, and provide great autocomplete.
*   **Zod:** A schema declaration and validation library. It ensures the data users send to your API (like emails or usernames) is valid before it hits your database.

### **Data Layer**
*   **PostgreSQL (Hosted on Supabase):** A powerful, open-source relational database. Supabase provides a managed instance of it with connection pooling (PgBouncer) so your app doesn't drop connections under heavy load.
*   **Prisma ORM:** Used for database modeling (`schema.prisma`), migrations, and querying data safely.

### **Integrations & Third-Party APIs**
*   **Clerk:** Handles all user authentication (Sign up, Log in, Session management). It is far more secure than building custom JWT/Password hashing from scratch.
*   **JDoodle API:** A remote code execution engine. When users run code in your Playground, the backend securely forwards it to JDoodle to be compiled and executed, returning the output and CPU/Memory stats.
*   **Codeforces & LeetCode APIs:** Polled by your background workers to build the live Activity Feed and Leaderboards.

---

## 3. Project Architecture (How it works together)

Your project is structured as a **Monorepo** using npm workspaces. This means both the frontend (`apps/web`) and backend (`apps/api`) live in the same repository, allowing them to share code and TypeScript configurations easily.

### The Request Flow (Example: User visits Dashboard)
1. **The Client:** The user opens the React app (hosted on Vercel) in their browser.
2. **Auth Verification:** React checks with the Clerk SDK if the user is logged in. If yes, it grabs a secure authentication token.
3. **API Call:** React makes an HTTP `GET` request (using Axios) to your Node.js API (hosted on Render), attaching the Clerk token.
4. **Middleware:** Express receives the request. The `requireClerkAuth` middleware verifies the token is authentic.
5. **Database Query:** The Express route handler uses Prisma to query Supabase (`prisma.activityFeed.findMany(...)`).
6. **Response:** Express sends the data back as JSON, and React renders the Dashboard cards.

### The Background Worker Architecture
Instead of using a complex external message broker (like Redis + BullMQ), your backend runs a **lightweight, in-memory polling system**. 
When the Express server boots up, it starts a native Node.js timer (`setInterval`). Every 5 minutes, this background process wakes up, asks the LeetCode and Codeforces APIs for new user submissions, and saves any new solved problems into the Supabase database. This keeps your architecture simple, robust, and free to host!
