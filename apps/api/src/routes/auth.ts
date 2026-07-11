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
      // 1. Try to find the user by the current Clerk ID
      let existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

      // 2. If not found by Clerk ID, check if they exist by email.
      // This happens when you switch between Production and Development Clerk instances.
      // The Clerk ID changes, but the email remains the same.
      if (!existing) {
        existing = await prisma.user.findUnique({ where: { email } });
      }

      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id }, // Use internal ID to update safely
            data: { 
              clerkId: clerkUserId, // Update the clerkId to the current environment's ID
              email // Update email just in case it changed
            }
          })
        : await prisma.user.create({
            data: { clerkId: clerkUserId, username, email }
          });

      res.json({ user });
    } catch (err: any) {
      // Safely check for Prisma P2002 without using instanceof which can fail in ESM
      if (err && typeof err === "object" && err.code === "P2002") {
        const target = err.meta?.target as string[] | undefined;
        if (target?.includes("username")) {
          res.status(409).json({ error: `Username "${username}" is already taken. Please choose another.` });
          return;
        }
      }
      throw err; // re-throw anything else so the global errorHandler handles it
    }
  })
);
