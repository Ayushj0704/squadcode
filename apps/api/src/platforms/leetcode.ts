import axios from "axios";
import type { LeetCodeCache } from "./types.js";
import { z } from "zod";

const ALFA_BASE = "https://alfa-leetcode-api.onrender.com";

const alfaSchema = z
  .object({
    totalSolved: z.coerce.number().optional(),
    easySolved: z.coerce.number().optional(),
    mediumSolved: z.coerce.number().optional(),
    hardSolved: z.coerce.number().optional(),
    ranking: z.coerce.number().optional(),
    streak: z.coerce.number().optional(),
    username: z.string().optional(),
    name: z.string().optional(),
    fullName: z.string().optional(),
    realName: z.string().optional()
  })
  .passthrough();

export async function fetchLeetCodeData(username: string): Promise<LeetCodeCache> {
  const res = await axios.get(`${ALFA_BASE}/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/json" },
    timeout: 20_000,
    validateStatus: () => true
  });

  if (res.status === 404) throw new Error("LeetCode user not found");
  if (res.status < 200 || res.status >= 300) {
    throw new LeetCodeBlockedError("LeetCode third-party API request failed.");
  }

  const data = alfaSchema.parse(res.data);
  return {
    username: data.username ?? username,
    totalSolved: data.totalSolved ?? 0,
    easySolved: data.easySolved ?? 0,
    mediumSolved: data.mediumSolved ?? 0,
    hardSolved: data.hardSolved ?? 0,
    ranking: data.ranking,
    streak: data.streak
  };
}

export class LeetCodeBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeetCodeBlockedError";
  }
}

export class LeetCodeVerificationUnavailableError extends Error {
  constructor() {
    super("LeetCode verification is currently unavailable. Please try again in a few minutes.");
    this.name = "LeetCodeVerificationUnavailableError";
  }
}

export async function verifyLeetCodeToken(username: string, token: string) {
  const res = await axios.get(`${ALFA_BASE}/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/json" },
    timeout: 20_000,
    validateStatus: () => true
  });

  if (res.status === 404) return false;
  if (res.status < 200 || res.status >= 300) {
    throw new LeetCodeVerificationUnavailableError();
  }

  const data = alfaSchema.parse(res.data);
  const displayName =
    data.fullName ?? data.realName ?? data.name ?? "";
  if (!displayName) return false;
  return displayName.includes(token);
}
