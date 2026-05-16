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

type Post = {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string };
};

export function ThreadDetailPage() {
  const { id, thread_id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    if (!thread_id) return;
    setError(null);
    const res = await api.get(`/threads/${thread_id}/posts`);
    setThread(res.data.thread);
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
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(`/squad/${id}/threads`)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Back to threads
            </button>
            <h1 className="mt-2 text-lg font-semibold">{thread?.title ?? "Thread"}</h1>
            {thread ? (
              <p className="mt-1 text-sm text-slate-300">
                {thread.platform} • {thread.contestName}
              </p>
            ) : null}
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
        <div className="text-sm font-semibold">Posts</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {posts.length === 0 ? (
            <div className="text-sm text-slate-400">No posts yet.</div>
          ) : null}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <div>{p.user.username}</div>
                <div>{new Date(p.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-100">
                {p.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="text-sm font-semibold">Reply</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-3 w-full min-h-28 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
          placeholder="Write a reply…"
        />
        <button
          onClick={addPost}
          disabled={posting || !content.trim()}
          className="mt-3 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
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

