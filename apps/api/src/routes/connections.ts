import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/google.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { randomToken } from "../lib/random.js";
import { minutesFromNow } from "../lib/time.js";
import { fetchCodeforcesData, verifyCodeforcesToken } from "../platforms/codeforces.js";
import {
  fetchLeetCodeData,
  verifyLeetCodeToken,
  LeetCodeVerificationUnavailableError
} from "../platforms/leetcode.js";
import { fetchGitHubData } from "../platforms/github.js";
import { env } from "../env.js";
import { Prisma } from "@prisma/client";
import axios from "axios";

async function upsertCache(params: {
  userId: string;
  platform: "codeforces" | "leetcode" | "github";
  data: unknown;
}) {
  await prisma.platformDataCache.upsert({
    where: { userId_platform_cache: { userId: params.userId, platform: params.platform } },
    update: { data: params.data as Prisma.InputJsonValue, fetchedAt: new Date() },
    create: { userId: params.userId, platform: params.platform, data: params.data as Prisma.InputJsonValue }
  });
}

export const connectionsRouter = Router();

const initiateSchema = z.object({
  platform: z.enum(["codeforces", "leetcode", "github"]),
  username: z.string().min(2).max(64)
});

connectionsRouter.post(
  "/initiate",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { platform, username } = initiateSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    // GitHub: no ownership verification token in this MVP
    if (platform === "github") {
      const conn = await prisma.platformConnection.upsert({
        where: { userId_platform: { userId: me.id, platform } },
        update: {
          username,
          verified: true,
          verificationToken: null,
          tokenExpiresAt: null
        },
        create: {
          userId: me.id,
          platform,
          username,
          verified: true
        }
      });
      const data = await fetchGitHubData(username, env.GITHUB_API_TOKEN);
      await upsertCache({ userId: me.id, platform, data });
      res.json({ connection: conn, token: null });
      return;
    }

    const token = randomToken("SQUAD", 6);
    const expiresAt = minutesFromNow(10);
    const conn = await prisma.platformConnection.upsert({
      where: { userId_platform: { userId: me.id, platform } },
      update: {
        username,
        verified: false,
        verificationToken: token,
        tokenExpiresAt: expiresAt
      },
      create: {
        userId: me.id,
        platform,
        username,
        verified: false,
        verificationToken: token,
        tokenExpiresAt: expiresAt
      }
    });

    res.json({ connection: conn, token });
  })
);

const verifySchema = z.object({
  platform: z.enum(["codeforces", "leetcode"]),
  username: z.string().min(2).max(64)
});

connectionsRouter.post(
  "/verify",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { platform, username } = verifySchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const conn = await prisma.platformConnection.findUnique({
      where: { userId_platform: { userId: me.id, platform } }
    });
    if (!conn || conn.username !== username) {
      res.status(404).json({ error: "No pending connection for this platform/username" });
      return;
    }
    if (!conn.verificationToken || !conn.tokenExpiresAt) {
      res.status(400).json({ error: "No verification token. Initiate again." });
      return;
    }
    if (conn.tokenExpiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: "Token expired. Initiate again." });
      return;
    }

    let found = false;
    try {
      found =
        platform === "codeforces"
          ? await verifyCodeforcesToken(username, conn.verificationToken)
          : await verifyLeetCodeToken(username, conn.verificationToken);
    } catch (e: unknown) {
      if (platform === "leetcode") {
        if (e instanceof LeetCodeVerificationUnavailableError) {
          res.status(503).json({ error: e.message });
          return;
        }
        res.status(502).json({
          error: "Failed to fetch LeetCode profile page for verification.",
          hint: "LeetCode may be rate-limiting or blocking this server. Retry later.",
          details: axios.isAxiosError(e)
            ? { status: e.response?.status, code: e.code, message: e.message }
            : undefined
        });
        return;
      }
      throw e;
    }

    if (!found) {
      res.status(400).json({ error: "Token not found on profile yet. Try again." });
      return;
    }

    const updated = await prisma.platformConnection.update({
      where: { id: conn.id },
      data: {
        verified: true,
        verificationToken: null,
        tokenExpiresAt: null
      }
    });

    const data =
      platform === "codeforces"
        ? await fetchCodeforcesData(username)
        : await fetchLeetCodeData(username);
    await upsertCache({ userId: me.id, platform, data });

    res.json({ connection: updated });
  })
);

connectionsRouter.get(
  "/status",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const connections = await prisma.platformConnection.findMany({
      where: { userId: me.id },
      select: {
        id: true,
        platform: true,
        username: true,
        verified: true,
        connectedAt: true,
        verificationToken: true,
        tokenExpiresAt: true,
      },
      orderBy: { connectedAt: "desc" }
    });

    res.json({ connections });
  })
);
