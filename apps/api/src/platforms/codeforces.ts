import axios from "axios";
import * as cheerio from "cheerio";
import type { CodeforcesCache } from "./types.js";

const CF_API = "https://codeforces.com/api";

type CfUserInfo = {
  handle?: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
};

type CfRatingChange = {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
};

type CfProblem = {
  contestId?: number;
  index?: string;
  name: string;
  rating?: number;
  tags: string[];
};

type CfSubmission = {
  id: number;
  creationTimeSeconds: number;
  verdict?: string;
  programmingLanguage?: string;
  problem?: CfProblem;
};

export async function fetchCodeforcesData(username: string): Promise<CodeforcesCache> {
  const [infoRes, ratingRes, statusRes] = await Promise.all([
    axios.get(`${CF_API}/user.info`, { params: { handles: username } }),
    axios.get(`${CF_API}/user.rating`, { params: { handle: username } }),
    axios.get(`${CF_API}/user.status`, { params: { handle: username, count: 100 } })
  ]);

  if (infoRes.data?.status !== "OK") throw new Error("Codeforces user.info failed");
  if (ratingRes.data?.status !== "OK") throw new Error("Codeforces user.rating failed");
  if (statusRes.data?.status !== "OK") throw new Error("Codeforces user.status failed");

  const info = (infoRes.data.result?.[0] ?? {}) as CfUserInfo;
  const rating = (ratingRes.data.result ?? []) as CfRatingChange[];
  const submissions = (statusRes.data.result ?? []) as CfSubmission[];

  const last10Contests = rating.slice(-10).reverse().map((r) => ({
    contestId: r.contestId,
    contestName: r.contestName,
    rank: r.rank,
    oldRating: r.oldRating,
    newRating: r.newRating,
    ratingUpdateTimeSeconds: r.ratingUpdateTimeSeconds
  }));

  const solvedSet = new Set<string>();
  for (const s of submissions) {
    if (s.verdict === "OK" && s.problem) {
      const key = `${s.problem.contestId ?? "x"}-${s.problem.index ?? "?"}`;
      solvedSet.add(key);
    }
  }

  return {
    handle: info.handle ?? username,
    rating: info.rating,
    maxRating: info.maxRating,
    rank: info.rank,
    maxRank: info.maxRank,
    contestCount: rating.length,
    last10Contests,
    problemsSolvedCount: solvedSet.size,
    recentSubmissions: submissions.slice(0, 20).map((s) => ({
      id: s.id,
      creationTimeSeconds: s.creationTimeSeconds,
      problem: {
        name: s.problem?.name ?? "",
        index: s.problem?.index ?? "",
        rating: s.problem?.rating,
        tags: s.problem?.tags ?? []
      },
      verdict: s.verdict,
      programmingLanguage: s.programmingLanguage
    }))
  };
}

export async function verifyCodeforcesToken(username: string, token: string) {
  const res = await axios.get(`https://codeforces.com/profile/${encodeURIComponent(username)}`, {
    headers: {
      "User-Agent": "SquadCodeBot/1.0"
    }
  });
  const $ = cheerio.load(res.data as string);
  const pageText = $("body").text();
  return pageText.includes(token);
}
