import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";


type Sheet = {
  id: string;
  title: string;
  createdAt: string;
  problems: Array<{ id: string; completions: Array<{ id: string }> }>;
};

export function SheetsListPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!selectedSquadId) return;
    setError(null);
    const res = await api.get(`/sheets/${selectedSquadId}`);
    setSheets(res.data.sheets);
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
      const res = await api.post("/sheets", { squadId: selectedSquadId, title });
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
        {error ? <div className="mt-3 text-sm text-coral-500 font-bold">{error}</div> : null}
      </Card>

      <Card>
        <div className="text-sm font-bold">Create sheet</div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sheet title"
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
        {sheets.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-0 p-6 text-sm text-ink-400">
            No sheets yet.
          </div>
        ) : null}
        {sheets.map((s) => {
          const totalProblems = s.problems.length;
          const totalCompletions = s.problems.reduce(
            (sum, p) => sum + p.completions.length,
            0
          );
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
