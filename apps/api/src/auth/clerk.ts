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

  // Run Clerk's requireAuth, then verify auth context was actually populated.
  // If CLERK_SECRET_KEY is for a different app than the JWT's issuer, Clerk
  // may call next() without setting auth.userId — which would throw a generic
  // Error in getClerkUserId and silently become a 500.
  return requireAuthMiddleware(req, res, (err?: unknown) => {
    if (err) return next(err); // Clerk already rejected — let errorHandler handle it

    const auth = getAuth(req);
    if (!auth.userId) {
      console.error(
        "[requireClerkAuth] Clerk passed but auth.userId is missing. " +
        "Possible CLERK_SECRET_KEY mismatch (wrong Clerk app). " +
        `Expected issuer from token: check your Render env CLERK_SECRET_KEY starts with sk_test_ and matches VITE_CLERK_PUBLISHABLE_KEY app.`
      );
      res.status(401).json({
        error: "Unauthorized: could not resolve user. Check that CLERK_SECRET_KEY on the server matches your frontend Clerk app."
      });
      return;
    }

    next();
  });
};

export function getClerkUserId(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) throw new Error("Missing auth context");
  return auth.userId;
}
