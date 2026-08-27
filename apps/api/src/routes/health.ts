import { Router } from "express";
import { prisma } from "../prisma.js";

export const healthRouter = Router();

// Basic liveness check (no DB) – used by Render's health-check ping.
healthRouter.get("/", (_req, res) => {
  res.json({ ok: true });
});

// Deep health check – tests DB connectivity AND table existence.
// Visit https://squadcode.onrender.com/api/health/db to diagnose issues.
healthRouter.get("/db", async (_req, res) => {
  const result: Record<string, unknown> = {
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      hasClerkKey: Boolean(process.env.CLERK_SECRET_KEY),
      clerkKeyPrefix: process.env.CLERK_SECRET_KEY?.slice(0, 8) ?? "not-set",
      nodeEnv: process.env.NODE_ENV,
    }
  };

  // 1. Basic connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.dbConnected = true;
  } catch (e) {
    result.dbConnected = false;
    result.dbConnectError = String(e);
    return res.status(503).json({ ok: false, ...result });
  }

  // 2. Check if users table exists and is accessible
  try {
    const count = await prisma.user.count();
    result.usersTable = "exists";
    result.userCount = count;
  } catch (e) {
    result.usersTable = "error";
    result.usersTableError = String(e);
  }

  // 3. Check clerk middleware setup (just verify env key format)
  const key = process.env.CLERK_SECRET_KEY ?? "";
  result.clerkKeyType =
    key.startsWith("sk_live_") ? "production" :
    key.startsWith("sk_test_") ? "development" :
    key.length > 0 ? "unknown-format" : "missing";

  const ok = result.dbConnected && result.usersTable === "exists";
  res.status(ok ? 200 : 503).json({ ok, ...result });
});
