import type { Request, RequestHandler } from "express";
import { getAuth } from "@clerk/express";

// NOTE: We intentionally do NOT use requireAuth() here.
// requireAuth() calls response.redirect("/") when no userId is found — which
// is fine for web pages but wrong for API endpoints. A redirect from an API
// route causes the Axios client to follow it, potentially hitting the SPA
// fallback and getting a 500 if index.html is absent.
//
// Instead we rely on clerkMiddleware() (registered globally in index.ts) to
// populate req.auth, and do our own userId check that returns 401 JSON.

export const requireClerkAuth: RequestHandler = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error(
      "[requireClerkAuth] CLERK_SECRET_KEY is not set. " +
      "Add it to your Render environment variables and redeploy."
    );
    res.status(503).json({
      error: "Server is missing CLERK_SECRET_KEY. Contact the administrator."
    });
    return;
  }

  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      // clerkMiddleware ran but couldn't authenticate this request
      // (expired token, wrong Clerk instance, missing token, etc.)
      console.warn(
        "[requireClerkAuth] Request rejected — no userId in auth context. " +
        "Possible causes: expired JWT, CLERK_SECRET_KEY mismatch, or missing Authorization header."
      );
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  } catch (err) {
    // getAuth() throws if clerkMiddleware hasn't run yet.
    // In practice this shouldn't happen since clerkMiddleware is global,
    // but we handle it to avoid a hard 500.
    console.error("[requireClerkAuth] getAuth() threw unexpectedly:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};

export function getClerkUserId(req: Request): string {
  const auth = getAuth(req);
  if (!auth.userId) throw new Error("Missing auth context — requireClerkAuth should have blocked this");
  return auth.userId;
}
