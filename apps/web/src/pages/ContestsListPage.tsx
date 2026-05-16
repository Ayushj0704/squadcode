import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";

type Contest = {
  id: string;
  platform: string;
  contestName: string;
  contestUrl: string | null;
  startTime: string;
  endTime: string;
};

export function ContestsListPage() {
  const { id: squadId } = useParams();
  const { getToken } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const api = createApiClient(getToken);
        const res = await api.get(`/squads/${squadId}/contests`);
        setContests(res.data.contests);
      } catch (err) {
        console.error("Failed to load contests", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [squadId, getToken]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading contests...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Active Contests</h1>
        <p className="text-slate-400 mt-1">Join a contest and discuss problems with your squad.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contests.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            No active contests found.
          </div>
        ) : (
          contests.map((c) => (
            <Link
              key={c.id}
              to={`/squad/${squadId}/contests/${c.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-blue-500/50 hover:bg-slate-900 transition"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
                {c.platform}
              </div>
              <h2 className="text-lg font-medium text-slate-100 mb-1">{c.contestName}</h2>
              <div className="text-sm text-slate-400">
                Starts: {new Date(c.startTime).toLocaleString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
