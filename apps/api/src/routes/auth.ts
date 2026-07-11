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
  (req, res, next) => {
    // TEMPORARY LOCAL DEBUG: Bypass auth if no auth header
    if (!req.headers.authorization && process.env.NODE_ENV !== "production") {
      (req as any).auth = { userId: "user_3Dnvx5XLzO5EdbHXpZJpzXlBuOZ" }; // hardcode mayank's clerk id
    }
    requireClerkAuth(req, res, next);
  },
  asyncRoute(async (req, res) => {
    const { username, email } = syncBodySchema.parse(req.body);
    let clerkUserId = (req as any).auth?.userId;
    if (!clerkUserId) clerkUserId = getClerkUserId(req);

    try {
      let existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

      if (!existing) {
        existing = await prisma.user.findFirst({ 
          where: { email: { equals: email, mode: 'insensitive' } } 
        });
      }

      let user;
      try {
        user = existing
          ? await prisma.user.update({
              where: { id: existing.id }, 
              data: { clerkId: clerkUserId, email }
            })
          : await prisma.user.create({
              data: { clerkId: clerkUserId, username, email }
            });
      } catch (innerErr: any) {
        console.error("CAUGHT Prisma error!", innerErr.code, innerErr.meta);
        // If a race condition caused a double-insert, or another edge case hit the unique constraint
        if (innerErr && typeof innerErr === "object" && innerErr.code === "P2002") {
          // Just fetch the user that was created by the competing request
          user = await prisma.user.findFirst({ 
            where: { email: { equals: email, mode: 'insensitive' } } 
          });
          console.error("User fetched after P2002:", user?.id || "NULL");
          if (!user) throw innerErr; // Something else went wrong
        } else {
          throw innerErr;
        }
      }

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
