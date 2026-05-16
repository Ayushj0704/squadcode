import axios from "axios";
import * as cheerio from "cheerio";
import type { GitHubCache } from "./types.js";

export async function fetchGitHubData(username: string, githubToken?: string): Promise<GitHubCache> {
  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : undefined
  });

  const userRes = await api.get(`/users/${encodeURIComponent(username)}`);
  const user = userRes.data ?? {};

  // Contribution graph is not in the REST API; scrape the profile page.
  const pageRes = await axios.get(`https://github.com/${encodeURIComponent(username)}`, {
    headers: { "User-Agent": "SquadCodeBot/1.0" }
  });
  const $ = cheerio.load(pageRes.data as string);

  const days = $("table.ContributionCalendar-grid td[data-date]")
    .toArray()
    .map((el) => {
      const date = $(el).attr("data-date") ?? "";
      const countStr = $(el).attr("data-level") ?? "0";
      const level = Number(countStr);
      const aria = $(el).attr("aria-label") ?? "";
      const match = aria.match(/(\\d+)/);
      const count = match ? Number(match[1]) : 0;
      return { date, count, level };
    })
    .filter((d) => d.date);

  const totalThisYear =
    days.reduce((sum, d) => sum + (Number.isFinite(d.count) ? d.count : 0), 0) || undefined;

  return {
    username,
    publicRepos: user.public_repos,
    followers: user.followers,
    contributionHeatmapLast52Weeks: days,
    totalContributionsThisYear: totalThisYear
  };
}

