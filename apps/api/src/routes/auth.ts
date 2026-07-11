import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

    try {
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
    } catch (err) {
      // Surface a helpful message when the chosen username is already taken
      // instead of letting the P2002 Prisma error become a generic 500.
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        res.status(409).json({ error: `Username "${username}" is already taken. Please choose another.` });
        return;
      }
      throw err; // re-throw anything else so the global errorHandler handles it
    }
  })
);
