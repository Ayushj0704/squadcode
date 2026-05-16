import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../env.js";
import { refreshSquad } from "./tasks/refreshSquad.js";
import { cleanupExpiredTokens } from "./tasks/tokenCleanup.js";

const QUEUE_SQUAD_REFRESH = "squad-refresh";
const QUEUE_TOKEN_CLEANUP = "token-cleanup";

let connection: Redis | null = null;
let squadRefreshQueue: Queue | null = null;
let tokenCleanupQueue: Queue | null = null;

function ensureConnection() {
  if (!env.REDIS_URL) return null;
  if (connection) return connection;
  connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}

export function isQueueEnabled() {
  return Boolean(env.REDIS_URL);
}

export async function enqueueSquadRefresh(params: { squadId: string }) {
  const conn = ensureConnection();
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
  const conn = ensureConnection();
  if (!conn) {
    // Fallback: no Redis configured, run cleanup on interval in-process.
    setInterval(() => {
      void cleanupExpiredTokens();
    }, 15 * 60_000).unref();
    
    setInterval(() => {
      void pollContestStatus();
    }, 30_000).unref();
    return;
  }

  // One-off queues for scheduling repeatables.
  if (!tokenCleanupQueue) tokenCleanupQueue = new Queue(QUEUE_TOKEN_CLEANUP, { connection: conn });

  // Repeatable cleanup every 15 minutes.
  await tokenCleanupQueue.add(
    "cleanup",
    {},
    { repeat: { every: 15 * 60_000 }, removeOnComplete: true, removeOnFail: true }
  );

  setInterval(() => {
    void pollContestStatus();
  }, 30_000).unref();

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
}
