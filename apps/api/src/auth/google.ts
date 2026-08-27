import type { Request, RequestHandler } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const requireClerkAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { userId: string, googleId: string };
    (req as any).googleId = decoded.googleId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export function getClerkUserId(req: Request): string {
  const googleId = (req as any).googleId;
  if (!googleId) throw new Error("Missing auth context");
  return googleId;
}

export const verifyGoogleIdToken = async (idToken: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};
