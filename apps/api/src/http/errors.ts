import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError
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
    console.warn(`[Validation Error] [${req.method} ${req.path}]`, err.issues);
    res.status(400).json({
      error: "Validation Error",
      details: err.issues
    });
    return;
  }

  // ── Prisma: known constraint / query errors ───────────────────────────────
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with that value already exists." });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found." });
      return;
    }
    // All other known Prisma codes — log and return 400
    console.error(`[Prisma ${err.code}] [${req.method} ${req.path}]`, err.message);
    res.status(400).json({ error: `Database error: ${err.code}` });
    return;
  }

  // ── Prisma: validation error (wrong field types / missing fields) ─────────
  if (err instanceof PrismaClientValidationError) {
    console.error(`[PrismaValidation] [${req.method} ${req.path}]`, err.message);
    res.status(400).json({ error: "Database query validation failed." });
    return;
  }

  // ── Prisma: database unreachable / not connected ──────────────────────────
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
  if (
    err !== null &&
    typeof err === "object" &&
    "clerkError" in err &&
    (err as { clerkError: boolean }).clerkError === true
  ) {
    const clerkErr = err as { status?: number; message?: string };
    const status = clerkErr.status ?? 401;
    console.warn(`[Clerk] [${req.method} ${req.path}]`, clerkErr.message);
    res.status(status).json({ error: clerkErr.message ?? "Unauthorized" });
    return;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${req.method} ${req.path}] Unhandled error: ${message}`, stack ?? err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: message, 
    stack: process.env.NODE_ENV === "development" ? stack : undefined 
  });
}
