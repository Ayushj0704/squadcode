import { Queue, Worker } from "bullmq";
import { env } from "../env.js";
import { refreshSquad } from "./tasks/refreshSquad.js";
import { cleanupExpiredTokens } from "./tasks/tokenCleanup.js";
import { pollActivityFeed } from "./tasks/activityFeed.js";

const QUEUE_SQUAD_REFRESH = "squad-refresh";
const QUEUE_TOKEN_CLEANUP = "token-cleanup";
const QUEUE_ACTIVITY_FEED = "activity-feed";

let connection: { url: string; maxRetriesPerRequest: null } | null = null;
let squadRefreshQueue: Queue | null = null;
let tokenCleanupQueue: Queue | null = null;
let activityFeedQueue: Queue | null = null;

function getConnectionOptions() {
  if (!env.REDIS_URL) return null;
  if (connection) return connection;
  connection = {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null
  };
  return connection;
}

export function isQueueEnabled() {
  return Boolean(env.REDIS_URL);
}

export async function enqueueSquadRefresh(params: { squadId: string }) {
  const conn = getConnectionOptions();
  if (!conn) {
    setImmediate(() => {
      void refreshSquad(params.squadId);
    });
    return;
  }
  if (!squadRefreshQueue) squadRefreshQueue = new Queue(QUEUE_SQUAD_REFRESH, { connection: conn });
  await squadRefreshQueue.add("refresh", { squadId: params.squadId }, { removeOnComplete: true, removeOnFail: true });
}

export async function initWorkers() {
  const conn = getConnectionOptions();
  if (!conn) {
    // Fallback: no Redis configured, run cleanup on interval in-process.
    setInterval(() => {
      void cleanupExpiredTokens();
    }, 15 * 60_000).unref();

    setInterval(() => {
      void pollActivityFeed();
    }, 5 * 60_000).unref();
    return;
  }

  // One-off queues for scheduling repeatables.
  if (!tokenCleanupQueue) tokenCleanupQueue = new Queue(QUEUE_TOKEN_CLEANUP, { connection: conn });
  if (!activityFeedQueue) activityFeedQueue = new Queue(QUEUE_ACTIVITY_FEED, { connection: conn });

  // Repeatable cleanup every 15 minutes.
  await tokenCleanupQueue.add(
    "cleanup",
    {},
    { repeat: { every: 15 * 60_000 }, removeOnComplete: true, removeOnFail: true }
  );

  // Repeatable activity feed poll every 5 minutes.
  await activityFeedQueue.add(
    "poll",
    {},
    { repeat: { every: 5 * 60_000 }, removeOnComplete: true, removeOnFail: true }
  );

  // Workers
  new Worker(
    QUEUE_SQUAD_REFRESH,
    async (job) => {
      await refreshSquad(job.data.squadId as string);
    },
    { connection: conn, concurrency: 2 }
  );

  new Worker(
    QUEUE_TOKEN_CLEANUP,
    async () => {
      await cleanupExpiredTokens();
    },
    { connection: conn, concurrency: 1 }
  );

  new Worker(
    QUEUE_ACTIVITY_FEED,
    async () => {
      await pollActivityFeed();
    },
    { connection: conn, concurrency: 1 }
  );
}
