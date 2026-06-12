import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";

export const authRouter = Router();

const syncBodySchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email()
});

authRouter.post(
  "/sync",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { username, email } = syncBodySchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);

    const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    const user = existing
      ? await prisma.user.update({
          where: { clerkId: clerkUserId },
          data: { email }
        })
      : await prisma.user.create({
          data: { clerkId: clerkUserId, username, email }
        });

    res.json({ user });
  })
);
