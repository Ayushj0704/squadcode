import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientUnknownRequestError
} from "@prisma/client/runtime/library";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // ── Validation errors ────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation Error", details: process.env.NODE_ENV === 'development' ? err.issues : undefined });
    return;
  }

  // ── Prisma: known errors (constraint violations etc.) ────────────────────
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Unique constraint violation" });
      return;
    }
  }

  // ── Prisma: database unreachable / not connected ─────────────────────────
  // This is the most common cause of 500s on Render when DATABASE_URL is
  // wrong, the Postgres instance is sleeping, or the connection pool is exhausted.
  if (
    err instanceof PrismaClientInitializationError ||
    err instanceof PrismaClientUnknownRequestError
  ) {
    console.error(`[DB ERROR] [${req.method} ${req.path}]`, err.message);
    res.status(503).json({
      error: "Database is unavailable. Check DATABASE_URL in your environment variables."
    });
    return;
  }

  // ── Clerk SDK errors ──────────────────────────────────────────────────────
  // Clerk errors have { clerkError: true, status, message }.
  // Without this block they silently become 500 — masking the real auth cause.
  if (
    err !== null &&
    typeof err === "object" &&
    "clerkError" in err &&
    (err as { clerkError: boolean }).clerkError === true
  ) {
    const clerkErr = err as { status?: number; message?: string };
    const status = clerkErr.status ?? 401;
    res.status(status).json({ error: clerkErr.message ?? "Unauthorized" });
    return;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${req.method} ${req.path}] Unhandled error: ${message}`, err);
  res.status(500).json({ error: "Internal Server Error" });
}
