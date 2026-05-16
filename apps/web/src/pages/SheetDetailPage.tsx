import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";

type Completion = { id: string; userId: string; completedAt: string };
type Problem = {
  id: string;
  problemName: string;
  platform: string;
  problemUrl: string;
  difficulty: "easy" | "medium" | "hard";
  completions: Completion[];
};

type Sheet = {
  id: string;
  title: string;
  createdAt: string;
  problems: Problem[];
};

export function SheetDetailPage() {
  const { id, sheet_id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [problemName, setProblemName] = useState("");
  const [platform, setPlatform] = useState("Codeforces");
  const [problemUrl, setProblemUrl] = useState("");
  const [difficulty, setDifficulty] = useState<Problem["difficulty"]>("medium");
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!id || !sheet_id) return;
    setError(null);
    const res = await api.get(`/sheets/${id}`);
    const found = (res.data.sheets as Sheet[]).find((s) => s.id === sheet_id) ?? null;
    if (!found) {
      setError("Sheet not found");
      setSheet(null);
      return;
    }
    setSheet(found);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet_id]);

  async function addProblem() {
    if (!sheet_id) return;
    setAdding(true);
    setError(null);
    try {
      await api.post(`/sheets/${sheet_id}/problems`, {
        problemName,
        platform,
        problemUrl,
        difficulty
      });
      setProblemName("");
      setProblemUrl("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function toggleComplete(problemId: string) {
    if (!sheet_id) return;
    setError(null);
    try {
      await api.post(`/sheets/${sheet_id}/problems/${problemId}/complete`);
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  const myUserId = user?.id ?? "";

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(`/squad/${id}/sheets`)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Back to sheets
            </button>
            <h1 className="mt-2 text-lg font-semibold">{sheet?.title ?? "Sheet"}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {sheet ? `${sheet.problems.length} problems` : "Loading..."}
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
        <div className="text-sm font-semibold">Add problem</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
          <input
            value={problemName}
            onChange={(e) => setProblemName(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Problem name"
          />
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Platform"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Problem["difficulty"])}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
          <input
            value={problemUrl}
            onChange={(e) => setProblemUrl(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="https://..."
          />
        </div>
        <button
          onClick={addProblem}
          disabled={adding || !problemName.trim() || !problemUrl.trim()}
          className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="text-sm font-semibold">Problems</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {!sheet || sheet.problems.length === 0 ? (
            <div className="text-sm text-slate-400">No problems yet.</div>
          ) : null}
          {sheet?.problems.map((p) => {
            const mine = p.completions.some((c) => c.userId === myUserId);
            return (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={p.problemUrl}
                      target="_blank"
                      className="font-semibold hover:underline"
                    >
                      {p.problemName}
                    </a>
                    <div className="mt-1 text-sm text-slate-300">
                      {p.platform} • {p.difficulty} • {p.completions.length} completions
                    </div>
                  </div>
                  <button
                    onClick={() => void toggleComplete(p.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      mine
                        ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                        : "border-slate-800 bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    {mine ? "Completed" : "Mark complete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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

