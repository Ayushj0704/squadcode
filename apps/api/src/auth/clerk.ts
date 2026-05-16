import type { Request, RequestHandler } from "express";
import { getAuth, requireAuth } from "@clerk/express";

const requireAuthMiddleware = requireAuth();

export const requireClerkAuth: RequestHandler = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY) {
    res.status(500).json({ error: "Server missing CLERK_SECRET_KEY config" });
    return;
  }
  return requireAuthMiddleware(req, res, next);
};

export function getClerkUserId(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) throw new Error("Missing auth context");
  return auth.userId;
}
