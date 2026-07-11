import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation Error", details: process.env.NODE_ENV === 'development' ? err.issues : undefined });
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Unique constraint violation" });
      return;
    }
  }

  // Clerk SDK errors have a `clerkError: true` property and a `status` field.
  // Without this block they fall through to the generic 500 handler, masking the
  // real cause (e.g. missing / expired JWT → 401, missing key → 500).
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

  console.error(`[${req.method} ${req.path}]`, err);
  res.status(500).json({ error: "Internal Server Error" });
}

