import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";

export const threadsRouter = Router();

threadsRouter.get(
  "/threads/:squad_id",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.squad_id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }
    const membership = await assertSquadMembership({ squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const threads = await prisma.contestThread.findMany({
      where: { squadId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ threads });
  })
);

const createThreadSchema = z.object({
  squadId: z.string().uuid(),
  title: z.string().min(2).max(120),
  platform: z.enum(["codeforces", "leetcode"]),
  contestName: z.string().min(2).max(120)
});

threadsRouter.post(
  "/threads",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const body = createThreadSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }
    const membership = await assertSquadMembership({ squadId: body.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const thread = await prisma.contestThread.create({
      data: {
        squadId: body.squadId,
        title: body.title,
        platform: body.platform,
        contestName: body.contestName,
        createdById: me.id
      }
    });
    res.json({ thread });
  })
);

threadsRouter.get(
  "/threads/:id/posts",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const threadId = String(req.params.id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const thread = await prisma.contestThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    const membership = await assertSquadMembership({ squadId: thread.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    const posts = await prisma.threadPost.findMany({
      where: { threadId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });
    res.json({ thread, posts });
  })
);

const createPostSchema = z.object({
  content: z.string().min(1).max(4000)
});

threadsRouter.post(
  "/threads/:id/posts",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const threadId = String(req.params.id);
    const { content } = createPostSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const thread = await prisma.contestThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    const membership = await assertSquadMembership({ squadId: thread.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    const post = await prisma.threadPost.create({
      data: {
        threadId,
        userId: me.id,
        content
      },
      include: { user: true }
    });

    res.json({ post });
  })
);
