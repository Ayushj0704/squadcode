import type { Request, RequestHandler } from "express";
import { getAuth, requireAuth } from "@clerk/express";

const requireAuthMiddleware = requireAuth();

export const requireClerkAuth: RequestHandler = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY) {
    // Log prominently so this shows up clearly in Render / deployment logs.
    console.error(
      "[requireClerkAuth] CLERK_SECRET_KEY is not set. " +
      "Add it to your Render environment variables and redeploy."
    );
    res.status(503).json({
      error: "Server is missing CLERK_SECRET_KEY. Contact the administrator."
    });
    return;
  }
  return requireAuthMiddleware(req, res, next);
};

export function getClerkUserId(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) throw new Error("Missing auth context");
  return auth.userId;
}
