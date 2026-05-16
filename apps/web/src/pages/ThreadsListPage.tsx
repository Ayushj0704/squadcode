import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";

type Thread = {
  id: string;
  title: string;
  platform: "codeforces" | "leetcode";
  contestName: string;
  createdAt: string;
};

export function ThreadsListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Thread["platform"]>("codeforces");
  const [contestName, setContestName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    const res = await api.get(`/threads/${id}`);
    setThreads(res.data.threads);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function createThread() {
    if (!id) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/threads", { squadId: id, title, platform, contestName });
      navigate(`/squad/${id}/threads/${res.data.thread.id}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Threads</h1>
            <p className="mt-1 text-sm text-slate-300">
              Private contest discussions for your squad.
            </p>
          </div>
          <button
            onClick={() => void load().catch((e) => setError(errorMessage(e)))}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="text-sm font-semibold">Create thread</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Title"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Thread["platform"])}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
          >
            <option value="codeforces">Codeforces</option>
            <option value="leetcode">LeetCode</option>
          </select>
          <input
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Contest name"
          />
        </div>
        <button
          onClick={createThread}
          disabled={creating || !title.trim() || !contestName.trim()}
          className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 text-sm text-slate-400">
            No threads yet.
          </div>
        ) : null}
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/squad/${id}/threads/${t.id}`)}
            className="text-left rounded-2xl border border-slate-900 bg-slate-900/20 p-5 hover:bg-slate-900/30"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{t.title}</div>
              <span className="text-xs text-slate-400">
                {new Date(t.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {t.platform} • {t.contestName}
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

