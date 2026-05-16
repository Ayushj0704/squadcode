import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";
import { fetchCodeforcesData } from "../platforms/codeforces.js";
import { fetchLeetCodeData } from "../platforms/leetcode.js";
import { fetchGitHubData } from "../platforms/github.js";
import { env } from "../env.js";
import { enqueueSquadRefresh } from "../workers/queue.js";
import { Prisma } from "@prisma/client";

export const platformDataRouter = Router();

async function upsertCache(params: {
  userId: string;
  platform: "codeforces" | "leetcode" | "github";
  data: unknown;
}) {
  return prisma.platformDataCache.upsert({
    where: { userId_platform_cache: { userId: params.userId, platform: params.platform } },
    update: { data: params.data as Prisma.InputJsonValue, fetchedAt: new Date() },
    create: { userId: params.userId, platform: params.platform, data: params.data as Prisma.InputJsonValue }
  });
}

platformDataRouter.get(
  "/data/codeforces/:username",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const username = String(req.params.username);
    const data = await fetchCodeforcesData(username);
    res.json({ data });
  })
);

platformDataRouter.get(
  "/data/leetcode/:username",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const username = String(req.params.username);
    const data = await fetchLeetCodeData(username);
    res.json({ data });
  })
);

platformDataRouter.get(
  "/data/github/:username",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const username = String(req.params.username);
    const data = await fetchGitHubData(username, env.GITHUB_API_TOKEN);
    res.json({ data });
  })
);

platformDataRouter.post(
  "/data/refresh/:squad_id",
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

    await enqueueSquadRefresh({ squadId });
    res.json({ ok: true });
  })
);

platformDataRouter.post(
  "/data/refresh_user",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const body = z.object({ platform: z.enum(["codeforces", "leetcode", "github"]) }).parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const conn = await prisma.platformConnection.findUnique({
      where: { userId_platform: { userId: me.id, platform: body.platform } }
    });
    if (!conn || !conn.verified) {
      res.status(400).json({ error: "Platform not connected/verified" });
      return;
    }

    const data =
      body.platform === "codeforces"
        ? await fetchCodeforcesData(conn.username)
        : body.platform === "leetcode"
          ? await fetchLeetCodeData(conn.username)
          : await fetchGitHubData(conn.username, env.GITHUB_API_TOKEN);

    await upsertCache({ userId: me.id, platform: body.platform, data });
    res.json({ ok: true });
  })
);
