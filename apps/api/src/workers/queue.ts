import { Queue, Worker } from "bullmq";
import { env } from "../env.js";
import { refreshSquad } from "./tasks/refreshSquad.js";
import { cleanupExpiredTokens } from "./tasks/tokenCleanup.js";
import { pollActivityFeed } from "./tasks/activityFeed.js";

const QUEUE_SQUAD_REFRESH = "squad-refresh";
const QUEUE_TOKEN_CLEANUP = "token-cleanup";
const QUEUE_ACTIVITY_FEED = "activity-feed";

import type { ConnectionOptions } from "bullmq";

let connection: ConnectionOptions | null = null;
let squadRefreshQueue: Queue | null = null;
let tokenCleanupQueue: Queue | null = null;
let activityFeedQueue: Queue | null = null;

function getConnectionOptions(): ConnectionOptions | null {
  if (!env.REDIS_URL) return null;
  if (connection) return connection;

  // Parse the Redis URL into ioredis-compatible connection options.
  // ioredis does NOT accept a { url } object — it needs host/port/password.
  const parsed = new URL(env.REDIS_URL);
  connection = {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username && parsed.username !== "default" ? parsed.username : undefined,
    maxRetriesPerRequest: null,
    // Upstash requires TLS — detect via rediss:// protocol
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {})
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
