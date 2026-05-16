import { prisma } from "../../prisma.js";
import { fetchCodeforcesData } from "../../platforms/codeforces.js";
import { fetchLeetCodeData } from "../../platforms/leetcode.js";
import { fetchGitHubData } from "../../platforms/github.js";
import { env } from "../../env.js";
import { Prisma } from "@prisma/client";

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

export async function refreshSquad(squadId: string) {
  const members = await prisma.squadMember.findMany({
    where: { squadId },
    include: { user: true }
  });
  const userIds = members.map((m) => m.userId);

  const connections = await prisma.platformConnection.findMany({
    where: { userId: { in: userIds }, verified: true }
  });

  // Fetch per user sequentially (safer for rate limits); can be optimized later.
  for (const conn of connections) {
    try {
      const data =
        conn.platform === "codeforces"
          ? await fetchCodeforcesData(conn.username)
          : conn.platform === "leetcode"
            ? await fetchLeetCodeData(conn.username)
            : await fetchGitHubData(conn.username, env.GITHUB_API_TOKEN);

      await upsertCache({ userId: conn.userId, platform: conn.platform, data });
    } catch (e) {
      console.warn(`refresh failed for ${conn.platform}:${conn.username}`, e);
    }
  }
}
