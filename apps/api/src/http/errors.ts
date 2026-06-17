import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
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

  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
}
