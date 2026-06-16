import { refreshSquad } from "./tasks/refreshSquad.js";
import { cleanupExpiredTokens } from "./tasks/tokenCleanup.js";
import { pollActivityFeed } from "./tasks/activityFeed.js";

export function isQueueEnabled() {
  return false; // We removed complex Redis queues to keep the architecture simple
}

// In-memory queue replacement for refreshing squad data
export async function enqueueSquadRefresh(params: { squadId: string }) {
  // Just run it asynchronously without blocking
  setImmediate(() => {
    void refreshSquad(params.squadId).catch(console.error);
  });
}

export async function initWorkers() {
  console.log("Starting lightweight in-memory workers...");

  // Run cleanup every 15 minutes
  setInterval(() => {
    void cleanupExpiredTokens().catch(console.error);
  }, 15 * 60_000).unref();

  // Poll activity feed (Codeforces, LeetCode) every 5 minutes
  setInterval(() => {
    void pollActivityFeed().catch(console.error);
  }, 5 * 60_000).unref();

  // Run them once on startup too
  setTimeout(() => {
    void cleanupExpiredTokens().catch(console.error);
    void pollActivityFeed().catch(console.error);
  }, 5000).unref();
}
