import axios from "axios";
import type { GitHubCache } from "./types.js";

type GitHubEvent = {
  type?: string;
  created_at?: string;
};

export async function fetchGitHubData(username: string, githubToken?: string): Promise<GitHubCache> {
  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Accept: "application/vnd.github+json",
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : undefined)
    },
    timeout: 20_000,
    validateStatus: () => true
  });

  // Use the public events API; treat PushEvent count as a contributions proxy.
  // If the API fails or returns nothing, we must show 0 (not "…").
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  let publicRepos: number | undefined = undefined;
  let followers: number | undefined = undefined;
  let totalContributionsThisYear = 0;

  try {
    const userRes = await api.get(`/users/${encodeURIComponent(username)}`);
    if (userRes.status >= 200 && userRes.status < 300) {
      const user = userRes.data ?? {};
      publicRepos = user.public_repos;
      followers = user.followers;
    }
  } catch {
    // ignore
  }

  try {
    let page = 1;
    const events: GitHubEvent[] = [];

    while (page <= 10) {
      const evRes = await api.get(
        `/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`
      );
      if (evRes.status < 200 || evRes.status >= 300) break;

      const pageEvents = Array.isArray(evRes.data) ? (evRes.data as GitHubEvent[]) : [];
      if (pageEvents.length === 0) break;
      events.push(...pageEvents);

      const oldest = pageEvents[pageEvents.length - 1]?.created_at;
      if (oldest) {
        const oldestTime = new Date(oldest).getTime();
        if (Number.isFinite(oldestTime) && oldestTime < cutoff) break;
      }
      page += 1;
    }

    totalContributionsThisYear = events.filter((e) => {
      if (e.type !== "PushEvent" || !e.created_at) return false;
      const t = new Date(e.created_at).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;
  } catch {
    totalContributionsThisYear = 0;
  }

  return {
    username,
    publicRepos,
    followers,
    totalContributionsThisYear
  };
}
