import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";

type Sheet = {
  id: string;
  title: string;
  createdAt: string;
  problems: Array<{ id: string; completions: Array<{ id: string }> }>;
};

export function SheetsListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    const res = await api.get(`/sheets/${id}`);
    setSheets(res.data.sheets);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function createSheet() {
    if (!id) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/sheets", { squadId: id, title });
      navigate(`/squad/${id}/sheets/${res.data.sheet.id}`);
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
            <h1 className="text-lg font-semibold">Practice sheets</h1>
            <p className="mt-1 text-sm text-slate-300">
              Shared problem lists for your squad.
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
        <div className="text-sm font-semibold">Create sheet</div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Sheet title"
          />
          <button
            onClick={createSheet}
            disabled={creating || !title.trim()}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sheets.length === 0 ? (
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 text-sm text-slate-400">
            No sheets yet.
          </div>
        ) : null}
        {sheets.map((s) => {
          const totalProblems = s.problems.length;
          const totalCompletions = s.problems.reduce((sum, p) => sum + p.completions.length, 0);
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/squad/${id}/sheets/${s.id}`)}
              className="text-left rounded-2xl border border-slate-900 bg-slate-900/20 p-5 hover:bg-slate-900/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{s.title}</div>
                <span className="text-xs text-slate-400">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {totalProblems} problems • {totalCompletions} completions
              </div>
            </button>
          );
        })}
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

