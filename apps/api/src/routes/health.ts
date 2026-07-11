import { Router } from "express";
import { prisma } from "../prisma.js";

export const healthRouter = Router();

// Basic liveness check (no DB) – used by Render's health-check ping.
healthRouter.get("/", (_req, res) => {
  res.json({ ok: true });
});

// Deep health check – tests DB connectivity.
// Visit https://squadcode.onrender.com/api/health/db to diagnose DB issues.
healthRouter.get("/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      db: "connected",
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasClerkKey: Boolean(process.env.CLERK_SECRET_KEY),
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Health /db] Database unreachable:", message);
    res.status(503).json({
      ok: false,
      db: "unreachable",
      error: message,
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasClerkKey: Boolean(process.env.CLERK_SECRET_KEY),
      }
    });
  }
});
