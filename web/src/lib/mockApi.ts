/**
 * Mock API Data & Handler
 * Provides rich hardcoded fallback data for UI testing when the backend database/server is down or returning 502 errors.
 */

export function getMockResponse(method: string, url: string, data?: any): { status: number; data: any } | null {
  const cleanUrl = url.split("?")[0].replace(/^\/api/, "");

  // 1. Squads mine
  if (cleanUrl === "/squads/mine") {
    return {
      status: 200,
      data: {
        squads: [
          {
            id: "squad-1",
            name: "Code Ninjas",
            description: "Competitive programming squad for LeetCode, Codeforces & GitHub",
            inviteCode: "NINJA2026",
            role: "admin",
            joinedAt: "2026-01-01T00:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "squad-2",
            name: "Algo Masters",
            description: "Advanced Data Structures & Algorithms preparation group",
            inviteCode: "ALGO99",
            role: "member",
            joinedAt: "2026-02-15T00:00:00Z",
            createdAt: "2026-02-10T00:00:00Z",
          },
        ],
      },
    };
  }

  // 2. Squad Dashboard
  if (cleanUrl.match(/\/squads\/[^/]+\/dashboard$/)) {
    const squadId = cleanUrl.split("/")[2] || "squad-1";
    return {
      status: 200,
      data: {
        squadId,
        squad: {
          id: squadId,
          name: squadId === "squad-2" ? "Algo Masters" : "Code Ninjas",
          inviteCode: "NINJA2026",
        },
        members: [
          {
            id: "m-1",
            role: "admin",
            nickname: "Alex (Captain)",
            joinedAt: "2026-01-01T00:00:00Z",
            user: {
              id: "user-1",
              username: "test_user",
              email: "test@example.com",
              profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
            },
          },
          {
            id: "m-2",
            role: "member",
            nickname: "Sarah Coder",
            joinedAt: "2026-01-02T00:00:00Z",
            user: {
              id: "user-2",
              username: "sarah_coder",
              email: "sarah@example.com",
              profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
            },
          },
          {
            id: "m-3",
            role: "member",
            nickname: "Dev Master",
            joinedAt: "2026-01-05T00:00:00Z",
            user: {
              id: "user-3",
              username: "dev_master",
              email: "dev@example.com",
              profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
            },
          },
          {
            id: "m-4",
            role: "member",
            nickname: "Elena Rust",
            joinedAt: "2026-01-10T00:00:00Z",
            user: {
              id: "user-4",
              username: "elena_r",
              email: "elena@example.com",
              profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena",
            },
          },
        ],
        connections: [
          { userId: "user-1", platform: "leetcode", username: "alex_lc", verified: true },
          { userId: "user-1", platform: "codeforces", username: "alex_cf", verified: true },
          { userId: "user-1", platform: "github", username: "alex_gh", verified: true },
          { userId: "user-2", platform: "leetcode", username: "sarah_lc", verified: true },
          { userId: "user-2", platform: "codeforces", username: "sarah_cf", verified: true },
          { userId: "user-3", platform: "github", username: "dev_gh", verified: true },
          { userId: "user-4", platform: "leetcode", username: "elena_lc", verified: true },
        ],
        caches: [
          {
            userId: "user-1",
            platform: "leetcode",
            fetchedAt: new Date().toISOString(),
            data: { totalSolved: 482, easySolved: 190, mediumSolved: 230, hardSolved: 62, ranking: 14250, streak: 45 },
          },
          {
            userId: "user-1",
            platform: "codeforces",
            fetchedAt: new Date().toISOString(),
            data: { rating: 1845, maxRating: 1920, rank: "candidate master" },
          },
          {
            userId: "user-1",
            platform: "github",
            fetchedAt: new Date().toISOString(),
            data: { totalContributions: 890, publicRepos: 34 },
          },
          {
            userId: "user-2",
            platform: "leetcode",
            fetchedAt: new Date().toISOString(),
            data: { totalSolved: 310, easySolved: 140, mediumSolved: 145, hardSolved: 25, ranking: 32100, streak: 12 },
          },
          {
            userId: "user-2",
            platform: "codeforces",
            fetchedAt: new Date().toISOString(),
            data: { rating: 1620, maxRating: 1680, rank: "expert" },
          },
          {
            userId: "user-3",
            platform: "github",
            fetchedAt: new Date().toISOString(),
            data: { totalContributions: 412, publicRepos: 18 },
          },
          {
            userId: "user-4",
            platform: "leetcode",
            fetchedAt: new Date().toISOString(),
            data: { totalSolved: 620, easySolved: 210, mediumSolved: 320, hardSolved: 90, ranking: 8400, streak: 88 },
          },
        ],
      },
    };
  }

  // 3. Activity Feed
  if (cleanUrl.match(/\/feed\/[^/]+$/)) {
    const squadId = cleanUrl.split("/")[2] || "squad-1";
    return {
      status: 200,
      data: {
        items: [
          {
            id: "f-1",
            squadId,
            userId: "user-1",
            platform: "leetcode",
            activityType: "problem_solved",
            description: "Solved Hard Problem: 'Trapping Rain Water II'",
            metadata: { problem: "Trapping Rain Water II", difficulty: "Hard" },
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            user: { id: "user-1", username: "test_user", email: "test@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex" },
          },
          {
            id: "f-2",
            squadId,
            userId: "user-2",
            platform: "codeforces",
            activityType: "rating_changed",
            description: "Rating increased by +45 in Codeforces Round 955 (Div. 2)",
            metadata: { newRating: 1620, delta: 45 },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            user: { id: "user-2", username: "sarah_coder", email: "sarah@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
          },
          {
            id: "f-3",
            squadId,
            userId: "user-3",
            platform: "github",
            activityType: "contest_participated",
            description: "Pushed 12 commits to 'squad-algorithm-vault'",
            metadata: {},
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
            user: { id: "user-3", username: "dev_master", email: "dev@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev" },
          },
          {
            id: "f-4",
            squadId,
            userId: "user-4",
            platform: "leetcode",
            activityType: "problem_solved",
            description: "Achieved a 90-day daily problem solving streak! 🔥",
            metadata: { streak: 90 },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            user: { id: "user-4", username: "elena_r", email: "elena@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena" },
          },
        ],
      },
    };
  }

  // 4. Threads list
  if (cleanUrl.match(/\/threads\/squad-[^/]+$/) || cleanUrl.match(/\/threads\/[^/]+$/)) {
    return {
      status: 200,
      data: {
        threads: [
          {
            id: "t-1",
            title: "Codeforces Round 955 (Div. 2) Post-Contest Discussion",
            platform: "codeforces",
            contestName: "CF Round 955",
            pinned: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
            _count: { posts: 14 },
          },
          {
            id: "t-2",
            title: "LeetCode Weekly Contest 410 Strategies & Solutions",
            platform: "leetcode",
            contestName: "Weekly Contest 410",
            pinned: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            _count: { posts: 8 },
          },
          {
            id: "t-3",
            title: "Dynamic Programming optimization tricks (Convex Hull Trick)",
            platform: "codeforces",
            contestName: "DP Masterclass",
            pinned: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
            _count: { posts: 5 },
          },
        ],
      },
    };
  }

  // 5. Thread detail posts
  if (cleanUrl.match(/\/threads\/[^/]+\/posts$/)) {
    return {
      status: 200,
      data: {
        posts: [
          {
            id: "p-1",
            threadId: "t-1",
            userId: "user-1",
            content: "How did everyone approach Problem C? The constraint N <= 2e5 suggests O(N log N) with a Fenwick tree.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            user: { id: "user-1", username: "test_user", email: "test@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex" },
          },
          {
            id: "p-2",
            threadId: "t-1",
            userId: "user-2",
            content: "I used Segment Tree with dynamic lazy propagation! Here is my snippet in C++:\n```cpp\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    cout << \"AC in 45ms!\" << endl;\n    return 0;\n}\n```",
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            user: { id: "user-2", username: "sarah_coder", email: "sarah@example.com", profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
          },
        ],
      },
    };
  }

  // 6. Sheets list
  if (cleanUrl.match(/\/sheets\/[^/]+$/) && !cleanUrl.includes("detail")) {
    return {
      status: 200,
      data: {
        sheets: [
          {
            id: "s-1",
            squadId: "squad-1",
            title: "Blind 75 & Essential DP Patterns",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
            _count: { problems: 12, completions: 28 },
          },
          {
            id: "s-2",
            squadId: "squad-1",
            title: "Graph Algorithms & Shortest Path Mastery",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
            _count: { problems: 8, completions: 14 },
          },
        ],
      },
    };
  }

  // 7. Sheet detail
  if (cleanUrl.match(/\/sheets\/detail\/[^/]+$/)) {
    const sheetId = cleanUrl.split("/").pop() || "s-1";
    return {
      status: 200,
      data: {
        sheet: {
          id: sheetId,
          squadId: "squad-1",
          title: "Blind 75 & Essential DP Patterns",
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          problems: [
            {
              id: "pr-1",
              title: "Two Sum",
              platform: "leetcode",
              problemUrl: "https://leetcode.com/problems/two-sum",
              difficulty: "easy",
              category: "Arrays & Hashing",
              points: 10,
              completions: [{ userId: "user-1", completedAt: new Date(Date.now() - 86400000).toISOString() }],
            },
            {
              id: "pr-2",
              title: "Longest Substring Without Repeating Characters",
              platform: "leetcode",
              problemUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters",
              difficulty: "medium",
              category: "Sliding Window",
              points: 20,
              completions: [{ userId: "user-1", completedAt: new Date(Date.now() - 43200000).toISOString() }],
            },
            {
              id: "pr-3",
              title: "Trapping Rain Water",
              platform: "leetcode",
              problemUrl: "https://leetcode.com/problems/trapping-rain-water",
              difficulty: "hard",
              category: "Two Pointers",
              points: 40,
              completions: [],
            },
            {
              id: "pr-4",
              title: "Coin Change",
              platform: "leetcode",
              problemUrl: "https://leetcode.com/problems/coin-change",
              difficulty: "medium",
              category: "Dynamic Programming",
              points: 25,
              completions: [{ userId: "user-2", completedAt: new Date(Date.now() - 20000000).toISOString() }],
            },
          ],
        },
      },
    };
  }

  // 8. Challenges list
  if (cleanUrl.match(/\/challenges\/[^/]+$/)) {
    return {
      status: 200,
      data: {
        challenges: [
          {
            id: "c-1",
            title: "Weekend DP & Graph Sprint",
            description: "Solve 4 curated DP & Graph problems before Sunday midnight to climb the leaderboard!",
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 4).toISOString(),
            _count: { participants: 4, problems: 4 },
            problems: [{ points: 100 }, { points: 200 }, { points: 300 }, { points: 400 }],
            participants: [
              { id: "user-1", score: 600, completedAt: new Date(Date.now() - 3600000).toISOString() },
              { id: "user-2", score: 300, completedAt: null },
              { id: "user-3", score: 100, completedAt: null },
            ],
          },
          {
            id: "c-2",
            title: "Speed Coding Arena: Tree Algorithms",
            description: "Fastest code submissions win bonus squad XP!",
            startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
            _count: { participants: 2, problems: 3 },
            problems: [{ points: 150 }, { points: 250 }, { points: 350 }],
            participants: [],
          },
        ],
      },
    };
  }

  // 9. Challenge Detail
  if (cleanUrl.match(/\/challenges\/[^/]+\/[^/]+$/)) {
    const parts = cleanUrl.split("/");
    const challengeId = parts.pop() || "c-1";
    return {
      status: 200,
      data: {
        challenge: {
          id: challengeId,
          title: "Weekend DP & Graph Sprint",
          description: "Solve 4 curated DP & Graph problems before Sunday midnight to climb the leaderboard!",
          startTime: new Date(Date.now() - 86400000).toISOString(),
          endTime: new Date(Date.now() + 86400000 * 4).toISOString(),
          problems: [
            { id: "cp-1", problemName: "Climbing Stairs", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/climbing-stairs", difficulty: "easy", points: 100 },
            { id: "cp-2", problemName: "Coin Change", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/coin-change", difficulty: "medium", points: 200 },
            { id: "cp-3", problemName: "Longest Increasing Subsequence", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/longest-increasing-subsequence", difficulty: "medium", points: 300 },
            { id: "cp-4", problemName: "Word Break II", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/word-break-ii", difficulty: "hard", points: 400 },
          ],
          participants: [
            { id: "user-1", score: 600, completedAt: new Date(Date.now() - 3600000).toISOString(), user: { username: "test_user" } },
            { id: "user-2", score: 300, completedAt: null, user: { username: "sarah_coder" } },
          ],
        },
      },
    };
  }

  // 10. Analytics
  if (cleanUrl.match(/\/analytics\/[^/]+$/)) {
    return {
      status: 200,
      data: {
        overview: {
          totalProblemsSolved: 1412,
          totalContests: 54,
          activeMembers: 4,
          avgRating: 1732,
          squadRank: 5,
        },
        platformBreakdown: { leetcode: 820, codeforces: 412, github: 180 },
        difficultyBreakdown: { easy: 540, medium: 680, hard: 192 },
        squad: {
          id: "squad-1",
          name: "Code Ninjas",
        },
        topContributors: [
          { userId: "user-1", username: "test_user", count: 48 },
          { userId: "user-2", username: "sarah_coder", count: 32 },
          { userId: "user-3", username: "dev_master", count: 21 },
          { userId: "user-4", username: "elena_r", count: 15 },
        ],
        sheetCompletion: [
          { id: "s-1", title: "Blind 75 & Essential DP Patterns", problemCount: 12, completionRate: 75 },
          { id: "s-2", title: "Graph Algorithms & Shortest Path", problemCount: 8, completionRate: 45 },
        ],
        contestParticipation: [
          { id: "t-1", title: "Codeforces Round 955 (Div. 2)", posts: 14 },
          { id: "t-2", title: "LeetCode Weekly Contest 410", posts: 8 },
        ],
        solvedByDay: [
          { date: "2026-07-25", solved: 14 },
          { date: "2026-07-26", solved: 22 },
          { date: "2026-07-27", solved: 18 },
          { date: "2026-07-28", solved: 35 },
          { date: "2026-07-29", solved: 28 },
          { date: "2026-07-30", solved: 42 },
          { date: "2026-07-31", solved: 50 },
        ],
        memberTrends: [
          { userId: "user-1", username: "test_user", total: 482, recent: 28, previous: 15, delta: 13 },
          { userId: "user-2", username: "sarah_coder", total: 310, recent: 18, previous: 10, delta: 8 },
          { userId: "user-4", username: "elena_r", total: 620, recent: 35, previous: 20, delta: 15 },
          { userId: "user-3", username: "dev_master", total: 412, recent: 5, previous: 12, delta: -7 },
        ],
        timeline: [
          { date: "2026-07-25", solved: 14, submissions: 20 },
          { date: "2026-07-26", solved: 22, submissions: 31 },
          { date: "2026-07-27", solved: 18, submissions: 25 },
          { date: "2026-07-28", solved: 35, submissions: 48 },
          { date: "2026-07-29", solved: 28, submissions: 40 },
          { date: "2026-07-30", solved: 42, submissions: 55 },
          { date: "2026-07-31", solved: 50, submissions: 68 },
        ],
      },
    };
  }

  // 11. Calendar Contests
  if (cleanUrl === "/data/contests") {
    return {
      status: 200,
      data: {
        contests: [
          {
            id: "cc-1",
            name: "Codeforces Round 956 (Div. 2)",
            platform: "codeforces",
            startTime: new Date(Date.now() + 86400000 * 1.5).toISOString(),
            durationSeconds: 7200,
            url: "https://codeforces.com/contests",
          },
          {
            id: "cc-2",
            name: "LeetCode Weekly Contest 411",
            platform: "leetcode",
            startTime: new Date(Date.now() + 86400000 * 3).toISOString(),
            durationSeconds: 5400,
            url: "https://leetcode.com/contest",
          },
          {
            id: "cc-3",
            name: "AtCoder Beginner Contest 365",
            platform: "atcoder",
            startTime: new Date(Date.now() + 86400000 * 4.2).toISOString(),
            durationSeconds: 6000,
            url: "https://atcoder.jp",
          },
          {
            id: "cc-4",
            name: "CodeChef Starters 145",
            platform: "codechef",
            startTime: new Date(Date.now() + 86400000 * 5.5).toISOString(),
            durationSeconds: 7200,
            url: "https://www.codechef.com",
          },
        ],
      },
    };
  }

  // 12. Connections Status
  if (cleanUrl === "/connections/status") {
    return {
      status: 200,
      data: {
        connections: [
          { userId: "user-1", platform: "leetcode", username: "alex_lc", verified: true },
          { userId: "user-1", platform: "codeforces", username: "alex_cf", verified: true },
          { userId: "user-1", platform: "github", username: "alex_gh", verified: true },
        ],
      },
    };
  }

  // 13. Notifications
  if (cleanUrl === "/notifications/unread-count") {
    return { status: 200, data: { count: 2 } };
  }

  if (cleanUrl === "/notifications") {
    return {
      status: 200,
      data: {
        notifications: [
          {
            id: "n-1",
            type: "challenge_created",
            title: "New Challenge Live!",
            body: "Weekend DP & Graph Sprint is now active. Join now!",
            link: "/challenges",
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-2",
            type: "thread_reply",
            title: "Reply in CF Round 955",
            body: "Sarah posted C++ AC code snippet in discussion thread",
            link: "/threads/t-1",
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      },
    };
  }

  // 14. Me & Profile
  if (cleanUrl === "/me" || cleanUrl.startsWith("/me/profile")) {
    return {
      status: 200,
      data: {
        id: "user-1",
        username: "test_user",
        email: "test@example.com",
        profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
        bio: "Full Stack Engineer & Competitive Programmer",
        connections: [
          { platform: "leetcode", username: "alex_lc", verified: true },
          { platform: "codeforces", username: "alex_cf", verified: true },
          { platform: "github", username: "alex_gh", verified: true },
        ],
        stats: {
          solved: 482,
          rating: 1845,
          contributions: 890,
        },
      },
    };
  }

  // 15. Billing
  if (cleanUrl === "/billing/status") {
    return {
      status: 200,
      data: {
        plan: "pro",
        rawPlan: "pro",
        limits: {
          squads: 5,
          membersPerSquad: 20,
          sheets: 50,
          playground: true,
          aiFeatures: true,
          priorityRefresh: true,
          customInviteLink: true,
          pricePerMonth: 19,
        },
        tag: {
          label: "Pro",
          emoji: "⚡",
          color: "pro",
          description: "Pro Plan Active — Unlimited Access",
        },
        planExpiresAt: null,
        hasPaymentMethod: true,
        hasSubscription: true,
        loading: false,
      },
    };
  }

  // 16. Playground Execute
  if (cleanUrl === "/execute") {
    return {
      status: 200,
      data: {
        output: "✅ Program executed successfully in 12ms!\n\nOutput:\nHello from SquadCode Playground!\nSorted array: [1, 2, 3, 5, 8, 13, 21]\nAll test cases passed.",
        error: null,
        timeMs: 12,
      },
    };
  }

  // 17. Playground Snippets
  if (cleanUrl === "/snippets" || cleanUrl.startsWith("/snippets/")) {
    return {
      status: 200,
      data: {
        id: "snip-101",
        title: "Fast I/O & Segment Tree Template",
        code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << "SquadCode Playground Mock Execution" << endl;\n    return 0;\n}`,
        language: "cpp",
      },
    };
  }

  // Generic fallback for POST / PATCH / PUT / DELETE mutations
  if (method !== "GET") {
    return {
      status: 200,
      data: { success: true, message: "Mock mutation completed successfully", ...data },
    };
  }

  // Generic GET fallback
  return {
    status: 200,
    data: { message: "Mock data fallback", success: true },
  };
}
