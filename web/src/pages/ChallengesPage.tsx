import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { Trophy, Clock, Users, ArrowRight, Swords, Plus, X } from "lucide-react";
import { useToast } from "../components/ui/Notifications";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  _count: {
    participants: number;
    problems: number;
  };
  problems: { points: number }[];
  participants?: {
    id: string;
    score: number;
    completedAt: string | null;
  }[];
};

export function ChallengesPage() {
  usePageTitle("Squad Challenges | SquadCode");
  const { showToast } = useToast();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Challenge State
  const [isCreating, setIsCreating] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    endTime: "",
    problems: [{ problemName: "", platform: "LeetCode", problemUrl: "", difficulty: "easy" as const, points: 100 }]
  });
  
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSquadId) return;
    try {
      const now = new Date();
      let end = new Date(newChallenge.endTime);
      if (isNaN(end.getTime()) || end.getTime() <= now.getTime() + 60000) {
        end = new Date();
        end.setDate(now.getDate() + 7); // Default to 7 days if empty or in the past
      }
      await api.post(`/challenges/${selectedSquadId}`, {
        title: newChallenge.title,
        description: newChallenge.description,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        problems: newChallenge.problems
      });
      window.location.reload();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to create challenge", 'error');
    }
  }

  useEffect(() => {
    async function load() {
      if (!selectedSquadId) return;
      try {
        const res = await api.get(`/challenges/${selectedSquadId}`);
        setChallenges(res.data.challenges);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [api, selectedSquadId]);

  if (!selectedSquadId) {
    return <div className="p-8 text-center font-bold">Select a squad first.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink-900 flex items-center gap-2">
            <Trophy className="text-yellow-500" size={32} />
            Squad Challenges
          </h1>
          <p className="mt-2 text-ink-600 font-medium text-lg">
            Compete against your teammates in timed problem sets.
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="rounded-xl border-2 border-ink-900 bg-brand-500 px-6 py-2.5 font-bold text-white shadow-pop transition hover:bg-brand-400 active:translate-y-1 active:shadow-none"
        >
          + Host Challenge
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border-2 border-border bg-surface-0 shadow-pop overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-border p-4 bg-surface-1">
              <h2 className="text-xl font-bold text-ink-900">Host New Challenge</h2>
              <button onClick={() => setIsCreating(false)} className="text-ink-500 hover:text-ink-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="grid gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-ink-700 mb-1">Challenge Title</label>
                  <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value})} className="w-full rounded-xl border-2 border-border p-2 outline-none focus:border-brand-500" placeholder="Weekend Boss Battle" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-700 mb-1">Description</label>
                  <input type="text" value={newChallenge.description} onChange={e => setNewChallenge({...newChallenge, description: e.target.value})} className="w-full rounded-xl border-2 border-border p-2 outline-none focus:border-brand-500" placeholder="Optional brief description" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-700 mb-1">End Date (Optional)</label>
                  <input type="datetime-local" value={newChallenge.endTime} onChange={e => setNewChallenge({...newChallenge, endTime: e.target.value})} className="w-full rounded-xl border-2 border-border p-2 outline-none focus:border-brand-500" />
                </div>
              </div>

              <h3 className="font-bold text-lg mb-3">Problems</h3>
              {newChallenge.problems.map((p, idx) => (
                <div key={idx} className="mb-4 rounded-xl border-2 border-border bg-surface-2 p-4 grid gap-3 grid-cols-1 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-1">Problem Name</label>
                    <input required type="text" value={p.problemName} onChange={e => {
                      const newP = [...newChallenge.problems]; newP[idx].problemName = e.target.value; setNewChallenge({...newChallenge, problems: newP});
                    }} className="w-full rounded-lg border-2 border-border p-1.5 text-sm outline-none focus:border-brand-500" placeholder="Two Sum" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-1">URL</label>
                    <input required type="url" value={p.problemUrl} onChange={e => {
                      const newP = [...newChallenge.problems]; newP[idx].problemUrl = e.target.value; setNewChallenge({...newChallenge, problems: newP});
                    }} className="w-full rounded-lg border-2 border-border p-1.5 text-sm outline-none focus:border-brand-500" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-1">Platform</label>
                    <select value={p.platform} onChange={e => {
                      const newP = [...newChallenge.problems]; newP[idx].platform = e.target.value; setNewChallenge({...newChallenge, problems: newP});
                    }} className="w-full rounded-lg border-2 border-border p-1.5 text-sm outline-none focus:border-brand-500">
                      <option value="LeetCode">LeetCode</option>
                      <option value="Codeforces">Codeforces</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-1">Difficulty</label>
                    <select value={p.difficulty} onChange={e => {
                      const newP = [...newChallenge.problems]; newP[idx].difficulty = e.target.value as any; setNewChallenge({...newChallenge, problems: newP});
                    }} className="w-full rounded-lg border-2 border-border p-1.5 text-sm outline-none focus:border-brand-500">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              ))}
              
              <button type="button" onClick={() => setNewChallenge({...newChallenge, problems: [...newChallenge.problems, { problemName: "", platform: "LeetCode", problemUrl: "", difficulty: "easy", points: 100 }]})} className="mb-6 flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-800">
                <Plus size={16} /> Add another problem
              </button>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-border">
                <button type="button" onClick={() => setIsCreating(false)} className="rounded-xl px-4 py-2 font-bold text-ink-600 hover:bg-surface-2 transition">Cancel</button>
                <button type="submit" className="rounded-xl border-2 border-ink-900 bg-brand-500 px-6 py-2 font-bold text-white shadow-pop-sm transition active:translate-y-0.5 active:shadow-none">Start Challenge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center p-12 animate-pulse text-ink-400 font-bold">Loading challenges...</div>
        ) : challenges.length === 0 ? (
          <div className="col-span-2 rounded-2xl border-2 border-dashed border-ink-200 bg-surface-0 p-12 text-center shadow-sm">
            <Swords className="mx-auto mb-4 text-ink-300" size={48} />
            <h2 className="mb-2 text-xl font-bold text-ink-900">No Challenges Yet</h2>
            <p className="text-ink-600">Challenge your squad to a timed contest.</p>
          </div>
        ) : (
          challenges.map((c) => {
            const now = new Date();
            const end = new Date(c.endTime);
            const isExpired = now > end;
            const maxScore = c.problems?.reduce((sum: number, p: any) => sum + p.points, 0) || 0;
            const myScore = c.participants?.[0]?.score || 0;
            const isCompleted = c.participants && c.participants.length > 0 && myScore >= maxScore && maxScore > 0;
            const isParticipating = c.participants && c.participants.length > 0;
            const isActive = !isExpired && !isCompleted;

            let badgeText = "ACTIVE";
            let badgeClasses = "bg-mint-100 text-mint-700 border-mint-200";
            if (isCompleted) {
              badgeText = "COMPLETED";
              badgeClasses = "bg-sun-100 text-sun-700 border-sun-200";
            } else if (isExpired) {
              badgeText = "EXPIRED";
              badgeClasses = "bg-ink-100 text-ink-600 border-ink-200";
            }

            return (
              <div key={c.id} className={`rounded-2xl border-2 p-6 shadow-card transition flex flex-col ${isActive ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface-0'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-ink-900">{c.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${badgeClasses}`}>
                    {badgeText}
                  </span>
                </div>
                
                <p className="text-ink-700 mb-6 text-sm">{c.description || "No description provided."}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
                    <Clock size={16} />
                    {isExpired ? "Ended" : "Ongoing Battle"}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
                    <Users size={16} />
                    {c._count.participants} Joined
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t-2 border-border/50 flex justify-between items-center">
                  <div className="text-sm font-bold text-ink-500">{c._count.problems} Problems</div>
                  {isParticipating ? (
                    <button onClick={() => navigate(`/challenges/${c.id}`)} className="flex items-center gap-2 font-bold text-brand-600 hover:text-brand-800">
                      View Board <ArrowRight size={16} />
                    </button>
                  ) : isActive ? (
                    <button 
                      onClick={async () => {
                        try {
                          await api.post(`/challenges/${selectedSquadId}/${c.id}/join`);
                          window.location.reload();
                        } catch (e: any) {
                          showToast(e.response?.data?.error || "Failed to join challenge", 'error');
                        }
                      }}
                      className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-bold text-white shadow-pop-sm hover:bg-ink-800"
                    >
                      Join Challenge
                    </button>
                  ) : (
                    <button onClick={() => navigate(`/challenges/${c.id}`)} className="flex items-center gap-2 font-bold text-ink-500 hover:text-ink-700">
                      Results <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
