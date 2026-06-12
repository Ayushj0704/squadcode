import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

type Thread = {
  id: string;
  squadId: string;
  title: string;
  platform: "codeforces" | "leetcode";
  contestName: string;
  createdAt: string;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string };
};

export function ThreadDetailPage() {
  usePageTitle("Thread | SquadCode");

  const { thread_id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    if (!thread_id) return;
    setError(null);
    const res = await api.get(`/threads/${thread_id}/posts`);
    const loadedThread = res.data.thread as Thread;
    setThread(loadedThread);
    setSelectedSquadId(loadedThread.squadId);
    setPosts(res.data.posts);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread_id]);

  async function addPost() {
    if (!thread_id) return;
    setPosting(true);
    setError(null);
    try {
      await api.post(`/threads/${thread_id}/posts`, { content });
      setContent("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(`/threads`)}
              className="text-xs text-ink-400 hover:text-ink-800"
            >
              Back to threads
            </button>
            <h1 className="mt-2 font-display text-lg font-bold">{thread?.title ?? "Thread"}</h1>
            {thread ? (
              <p className="mt-1 text-sm text-ink-600">
                {thread.platform} - {thread.contestName}
              </p>
            ) : null}
          </div>
          <button
            onClick={() => void load().catch((e) => setError(errorMessage(e)))}
            className="rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
          >
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-coral-500 font-bold">{error}</div> : null}
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Replies</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {posts.length === 0 ? (
            <div className="text-sm text-ink-400">No replies yet.</div>
          ) : null}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-ink-400">
                <div>{p.user.username}</div>
                <div>{new Date(p.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-ink-800">
                {p.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Write a reply</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-3 w-full min-h-28 rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
          placeholder="Write a reply..."
        />
        <button
          onClick={addPost}
          disabled={posting || !content.trim()}
          className="mt-3 rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post reply"}
        </button>
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
