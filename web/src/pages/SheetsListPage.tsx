import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState, ErrorState } from "../components/States";


type Sheet = {
  id: string;
  title: string;
  createdAt: string;
  dueDate: string | null;
  problems?: Array<{ id: string; completions: Array<{ id: string }> }>;
  _count?: { problems?: number; completions?: number };
};

export function SheetsListPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!selectedSquadId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(`/sheets/${selectedSquadId}`);
      setSheets(res.data.sheets);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquadId]);

  async function createSheet() {
    if (!selectedSquadId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/sheets", { squadId: selectedSquadId, title, dueDate: dueDate || null });
      navigate(`/sheets/${res.data.sheet.id}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  usePageTitle("Problem Sheets | SquadCode");

  if (!selectedSquadId) {
    return (
      <Card className="text-ink-600">Select a squad from the dashboard first.</Card>
    );
  }


  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold">Problem Sheets</h1>
            <p className="mt-1 text-sm text-ink-600">
              Shared problem lists for your squad.
            </p>
          </div>
          <Button
            onClick={() => void load().catch((e) => setError(errorMessage(e)))}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
        {error ? <div className="mt-4"><ErrorState error={error} onRetry={() => void load().catch((e) => setError(errorMessage(e)))} /></div> : null}
      </Card>

      <Card>
        <div className="text-sm font-bold">Create sheet</div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sheet title"
          />
          <Input
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            type="date"
            placeholder="Due date"
          />
          <Button
            onClick={createSheet}
            disabled={creating || !title.trim()}
            className="shrink-0"
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border-2 border-border bg-surface-2 shadow-card p-5 h-20"></div>
            ))}
          </div>
        ) : sheets.length === 0 ? (
          <EmptyState
            title="No sheets yet"
            description="Create a problem sheet above to start tracking practice problems."
            actionLabel="Create sheet"
            onAction={() => document.querySelector("input")?.focus()}
          />
        ) : (
          sheets.map((s) => {
            const totalProblems = s.problems?.length ?? s._count?.problems ?? 0;
            const totalCompletions = s.problems
              ? s.problems.reduce((sum, p) => sum + (p.completions?.length ?? 0), 0)
              : (s._count?.completions ?? 0);
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/sheets/${s.id}`)}
                className="text-left rounded-2xl border border-border-subtle bg-surface-1 p-5 hover:bg-surface-0 transition"
              >
              <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">{s.title}</div>
                  <span className="text-xs text-ink-400">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-600">
                  {totalProblems} problems - {totalCompletions} completions
                </div>
                {s.dueDate ? (
                  <div className="mt-2 text-xs font-bold text-sun-500">
                    Due {new Date(s.dueDate).toLocaleDateString()}
                  </div>
                ) : null}
              </button>
            );
          })
        )}
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
