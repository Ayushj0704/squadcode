import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/google.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";
import { onThreadPostEvent, publishThreadPostEvent } from "../threadEvents.js";

export const threadsRouter = Router();

threadsRouter.get(
  "/events/stream",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const memberships = await prisma.squadMember.findMany({
      where: { userId: me.id },
      select: { squadId: true }
    });
    const allowedSquadIds = new Set(memberships.map((m) => m.squadId));

    res.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no"
    });
    res.write(": connected\n\n");

    const send = (event: Parameters<typeof publishThreadPostEvent>[0]) => {
      if (!allowedSquadIds.has(event.squadId)) return;
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = onThreadPostEvent(send);
    const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  })
);

threadsRouter.get(
  "/:squad_id",
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
  "/",
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
  "/:id/posts",
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
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" }
    });
    res.json({ thread, posts });
  })
);

const createPostSchema = z.object({
  content: z.string().min(1).max(4000)
});

threadsRouter.post(
  "/:id/posts",
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
      include: { user: { select: { id: true, username: true } } }
    });

    publishThreadPostEvent({
      type: "thread-post",
      squadId: thread.squadId,
      threadId,
      postId: post.id,
      authorUsername: post.user.username,
      createdAt: post.createdAt.toISOString()
    });

    res.json({ post });
  })
);
