import axios from "axios";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

const CF_API = "https://codeforces.com/api";
const ALFA_BASE = "https://alfa-leetcode-api.onrender.com";

type CfSubmission = {
  id?: number;
  creationTimeSeconds?: number;
  verdict?: string;
  problem?: { name?: string; contestId?: number; index?: string };
};

type AlfaAcSubmission = {
  title?: string;
  titleSlug?: string;
  timestamp?: number | string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

async function upsertCache(params: {
  userId: string;
  platform: "codeforces" | "leetcode";
  data: unknown;
}) {
  await prisma.platformDataCache.upsert({
    where: { userId_platform_cache: { userId: params.userId, platform: params.platform } },
    update: { data: params.data as Prisma.InputJsonValue, fetchedAt: new Date() },
    create: { userId: params.userId, platform: params.platform, data: params.data as Prisma.InputJsonValue }
  });
}

export async function pollCodeforces(params: { squadId: string; userId: string; handle: string }) {
  const cacheRow = await prisma.platformDataCache.findUnique({
    where: { userId_platform_cache: { userId: params.userId, platform: "codeforces" } }
  });
  const isFirstSeen = !cacheRow;

  const cacheObj = asObject(cacheRow?.data) ?? {};
  const known = new Set<number>();
  const prevSubs = (cacheObj.recentSubmissions as unknown[] | undefined) ?? [];
  for (const s of prevSubs) {
    const id = numberOrNull(asObject(s)?.id);
    if (id !== null) known.add(id);
  }

  const res = await axios.get(`${CF_API}/user.status`, {
    params: { handle: params.handle, count: 10 },
    timeout: 20_000,
    validateStatus: () => true
  });
  if (res.status < 200 || res.status >= 300) return;
  if (res.data?.status !== "OK") return;
  const submissions = (res.data?.result ?? []) as CfSubmission[];

  const accepted = submissions
    .filter((s) => s.verdict === "OK" && typeof s.id === "number" && s.problem?.name)
    .sort((a, b) => (b.creationTimeSeconds ?? 0) - (a.creationTimeSeconds ?? 0));

  let newAccepted = accepted.filter((s) => typeof s.id === "number" && !known.has(s.id));
  if (isFirstSeen) {
    newAccepted = newAccepted.slice(0, 5); // backfill 5 items on first load
  }

  for (const s of newAccepted) {
    await prisma.activityFeed.create({
      data: {
        squadId: params.squadId,
        userId: params.userId,
        platform: "codeforces",
        activityType: "problem_solved",
        description: `solved ${s.problem?.name ?? "a problem"} on Codeforces`,
        metadata: {
          submissionId: s.id,
          creationTimeSeconds: s.creationTimeSeconds,
          contestId: s.problem?.contestId,
          index: s.problem?.index
        } as Prisma.InputJsonValue
      }
    });
  }

  const nextCache = {
    ...cacheObj,
    recentSubmissions: submissions.slice(0, 10).map((s) => ({
      id: s.id,
      creationTimeSeconds: s.creationTimeSeconds,
      verdict: s.verdict,
      problem: {
        name: s.problem?.name ?? "",
        index: s.problem?.index ?? "",
        contestId: s.problem?.contestId
      }
    }))
  };
  await upsertCache({ userId: params.userId, platform: "codeforces", data: nextCache });
}

export async function pollLeetCode(params: { squadId: string; userId: string; username: string }) {
  const cacheRow = await prisma.platformDataCache.findUnique({
    where: { userId_platform_cache: { userId: params.userId, platform: "leetcode" } }
  });
  const isFirstSeen = !cacheRow;
  const cacheObj = asObject(cacheRow?.data) ?? {};
  const known = new Set<string>();
  const prev = (cacheObj.recentAcceptedSubmissions as unknown[] | undefined) ?? [];
  for (const s of prev) {
    const o = asObject(s);
    const key = typeof o?.key === "string" ? (o.key as string) : null;
    if (key) known.add(key);
  }

  const res = await axios.get(`${ALFA_BASE}/${encodeURIComponent(params.username)}/acSubmission`, {
    headers: { Accept: "application/json" },
    timeout: 20_000,
    validateStatus: () => true
  });
  if (res.status < 200 || res.status >= 300) return;
  const submissions = (res.data?.submission ?? []) as AlfaAcSubmission[];

  const normalized = submissions
    .map((s) => {
      const timestamp = numberOrNull(s.timestamp);
      const title = (s.title ?? "").trim();
      const slug = (s.titleSlug ?? "").trim();
      if (!timestamp || !title) return null;
      return {
        key: `${timestamp}-${slug || title}`,
        title,
        titleSlug: slug || undefined,
        timestamp
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  let newAccepted = normalized.filter((s) => !known.has(s.key));
  if (isFirstSeen) {
    newAccepted = newAccepted.slice(0, 5); // backfill 5 items on first load
  }

  for (const s of newAccepted) {
    await prisma.activityFeed.create({
      data: {
        squadId: params.squadId,
        userId: params.userId,
        platform: "leetcode",
        activityType: "problem_solved",
        description: `solved ${s.title} on LeetCode`,
        metadata: {
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp
        } as Prisma.InputJsonValue
      }
    });
  }

  const nextCache = {
    ...cacheObj,
    recentAcceptedSubmissions: normalized
  };
  await upsertCache({ userId: params.userId, platform: "leetcode", data: nextCache });
}

export async function pollActivityFeed() {
  const squads = await prisma.squad.findMany({ select: { id: true } });
  for (const squad of squads) {
    const members = await prisma.squadMember.findMany({
      where: { squadId: squad.id },
      select: { userId: true }
    });
    const userIds = members.map((m) => m.userId);
    if (userIds.length === 0) continue;

    const connections = await prisma.platformConnection.findMany({
      where: { userId: { in: userIds }, verified: true, platform: { in: ["codeforces", "leetcode"] } },
      select: { userId: true, platform: true, username: true }
    });

    for (const conn of connections) {
      try {
        if (conn.platform === "codeforces") {
          await pollCodeforces({ squadId: squad.id, userId: conn.userId, handle: conn.username });
        } else if (conn.platform === "leetcode") {
          await pollLeetCode({ squadId: squad.id, userId: conn.userId, username: conn.username });
        }
      } catch (e) {
        console.warn(`activity poll failed for ${conn.platform}:${conn.username}`, e);
      }
    }
  }
}
