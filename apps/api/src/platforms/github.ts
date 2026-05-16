import axios from "axios";
import * as cheerio from "cheerio";
import type { GitHubCache } from "./types.js";

function isoDate(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchGitHubData(username: string, githubToken?: string): Promise<GitHubCache> {
  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : undefined
  });

  const userRes = await api.get(`/users/${encodeURIComponent(username)}`);
  const user = userRes.data ?? {};

  // Contribution graph is not in the REST API; scrape the contributions endpoint.
  const now = new Date();
  const from = isoDate(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
  const to = isoDate(now);
  const pageRes = await axios.get(
    `https://github.com/users/${encodeURIComponent(username)}/contributions?from=${from}&to=${to}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const $ = cheerio.load(pageRes.data as string);

  const days = $("td[data-date]")
    .toArray()
    .map((el) => {
      const date = $(el).attr("data-date") ?? "";
      const countStr = $(el).attr("data-level") ?? "0";
      const level = Number(countStr);
      return { date, count: 0, level };
    })
    .filter((d) => d.date);

  // GitHub renders per-day counts inside tool-tip sr-only text.
  const text = $.text();
  const matches = text.match(/\\b(\\d+) contributions? on\\b/g) ?? [];
  const counts = matches
    .map((m) => Number((m.match(/\\d+/) ?? [])[0] ?? 0))
    .filter((n) => Number.isFinite(n));
  const totalThisYear = counts.reduce((sum, n) => sum + n, 0) || undefined;

  return {
    username,
    publicRepos: user.public_repos,
    followers: user.followers,
    contributionHeatmapLast52Weeks: days,
    totalContributionsThisYear: totalThisYear
  };
}
