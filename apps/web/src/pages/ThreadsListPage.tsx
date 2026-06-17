import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { useNotificationStore } from "../store/notificationStore";
import { usePageTitle } from "../lib/usePageTitle";

type Thread = {
  id: string;
  title: string;
  platform: "codeforces" | "leetcode";
  contestName: string;
  createdAt: string;
};

export function ThreadsListPage() {
  usePageTitle("Contest Threads | SquadCode");

  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const lastThreadEvent = useNotificationStore((s) => s.lastThreadEvent);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Thread["platform"]>("codeforces");
  const [contestName, setContestName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!selectedSquadId) return;
    setError(null);
    const res = await api.get(`/threads/${selectedSquadId}`);
    setThreads(res.data.threads);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquadId, lastThreadEvent]);

  async function createThread() {
    if (!selectedSquadId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/threads", {
        squadId: selectedSquadId,
        title,
        platform,
        contestName
      });
      navigate(`/threads/${res.data.thread.id}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  if (!selectedSquadId) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-ink-600">
        Select a squad from the dashboard first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold">Contest Threads</h1>
            <p className="mt-1 text-sm text-ink-600">
              Private contest discussions for your squad.
            </p>
          </div>
          <button
            onClick={() => void load().catch((e) => setError(errorMessage(e)))}
            className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
          >
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-coral-500 font-bold">{error}</div> : null}
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Create thread</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Title"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Thread["platform"])}
            className="w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="codeforces">Codeforces</option>
            <option value="leetcode">LeetCode</option>
          </select>
          <input
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Contest name"
          />
        </div>
        <button
          onClick={createThread}
          disabled={creating || !title.trim() || !contestName.trim()}
          className="mt-4 rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {threads.length === 0 ? (
          <div className="rounded-2xl border-2 border-border bg-surface-2 p-6 text-sm text-ink-400">
            No threads yet.
          </div>
        ) : null}
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/threads/${t.id}`)}
            className="text-left rounded-2xl border-2 border-border bg-surface-0 shadow-card p-5 hover:bg-surface-raised/30"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold">{t.title}</div>
              <span className="text-xs text-ink-400">
                {new Date(t.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-sm text-ink-600">
              {t.platform} - {t.contestName}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
