import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

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
  usePageTitle("Problem Sheet | SquadCode");

  const { sheet_id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [problemName, setProblemName] = useState("");
  const [platform, setPlatform] = useState("Codeforces");
  const [problemUrl, setProblemUrl] = useState("");
  const [difficulty, setDifficulty] = useState<Problem["difficulty"]>("medium");
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!selectedSquadId || !sheet_id) return;
    setError(null);
    const res = await api.get(`/sheets/${selectedSquadId}`);
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

  if (!selectedSquadId) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-ink-600">
        Select a squad from the dashboard first.
      </div>
    );
  }

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
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(`/sheets`)}
              className="text-xs text-ink-400 hover:text-ink-800"
            >
              Back to sheets
            </button>
            <h1 className="mt-2 font-display text-lg font-bold">{sheet?.title ?? "Sheet"}</h1>
            <p className="mt-1 text-sm text-ink-600">
              {sheet ? `${sheet.problems.length} problems` : "Loading..."}
            </p>
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
        <div className="text-sm font-bold">Add problem</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
          <input
            value={problemName}
            onChange={(e) => setProblemName(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Problem name"
          />
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Platform"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Problem["difficulty"])}
            className="w-full rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
          <input
            value={problemUrl}
            onChange={(e) => setProblemUrl(e.target.value)}
            className="sm:col-span-2 w-full rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="https://..."
          />
        </div>
        <button
          onClick={addProblem}
          disabled={adding || !problemName.trim() || !problemUrl.trim()}
          className="mt-4 rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Problems</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {!sheet || sheet.problems.length === 0 ? (
            <div className="text-sm text-ink-400">No problems yet.</div>
          ) : null}
          {sheet?.problems.map((p) => {
            const mine = p.completions.some((c) => c.userId === myUserId);
            return (
              <div key={p.id} className="rounded-2xl border-2 border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={p.problemUrl}
                      target="_blank"
                      className="font-bold hover:underline"
                    >
                      {p.problemName}
                    </a>
                    <div className="mt-1 text-sm text-ink-600">
                      {p.platform} - {p.difficulty} - {p.completions.length} completions
                    </div>
                  </div>
                  <button
                    onClick={() => void toggleComplete(p.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                      mine
                        ? "border-mint-500 bg-mint-300/50 text-mint-500"
                        : "border-border-strong bg-surface-2 text-ink-800 hover:bg-surface-raised"
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
