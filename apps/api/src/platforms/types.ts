export type CodeforcesCache = {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  contestCount: number;
  last10Contests: Array<{
    contestId: number;
    contestName: string;
    rank: number;
    oldRating: number;
    newRating: number;
    ratingUpdateTimeSeconds: number;
  }>;
  problemsSolvedCount: number;
  recentSubmissions: Array<{
    id: number;
    creationTimeSeconds: number;
    problem: { name: string; index: string; rating?: number; tags: string[] };
    verdict?: string;
    programmingLanguage?: string;
  }>;
};

export type LeetCodeCache = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate?: number;
  ranking?: number;
  contributionPoints?: number;
  streak?: number;
};

export type GitHubCache = {
  username: string;
  publicRepos?: number;
  followers?: number;
  totalContributionsThisYear?: number;
  contributionHeatmapLast52Weeks?: Array<{
    date: string;
    count: number;
    level: number;
  }>;
};

