import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { verifyGoogleIdToken } from "../auth/google.js";
import jwt from "jsonwebtoken";

export const authRouter = Router();

const loginBodySchema = z.object({
  credential: z.string()
});

authRouter.post(
  "/login",
  asyncRoute(async (req, res) => {
    const { credential } = loginBodySchema.parse(req.body);
    
    const payload = await verifyGoogleIdToken(credential);
    if (!payload || !payload.email || !payload.sub) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const { email, sub: googleId, name } = payload;
    
    // Auto-generate username from email if creating new user
    const defaultUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);

    const existing = await prisma.user.findUnique({ where: { clerkId: googleId } });
    const user = existing
      ? await prisma.user.update({
          where: { clerkId: googleId },
          data: { email }
        })
      : await prisma.user.create({
          data: { clerkId: googleId, username: defaultUsername, email }
        });

    const token = jwt.sign(
      { userId: user.id, googleId },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.json({ user, token });
  })
);
