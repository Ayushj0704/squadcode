import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { ArrowLeft, Clock, Users, Trophy, ExternalLink, ShieldAlert, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast, useDialog } from "../components/ui/Notifications";

type ChallengeProblem = {
  id: string;
  problemName: string;
  platform: string;
  problemUrl: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
};

type ChallengeParticipant = {
  id: string;
  score: number;
  completedAt: string | null;
  user: {
    id: string;
    username: string;
    clerkId?: string;
  };
};

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  problems: ChallengeProblem[];
  participants: ChallengeParticipant[];
};

export function ChallengeDetailPage() {
  const { challenge_id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { selectedSquadId } = useSquadStore();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const { showToast } = useToast();
  const { showConfirm } = useDialog();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  usePageTitle(challenge ? `${challenge.title} | SquadCode` : "Challenge | SquadCode");

  useEffect(() => {
    async function load() {
      if (!selectedSquadId || !challenge_id) return;
      try {
        const res = await api.get(`/challenges/${selectedSquadId}/${challenge_id}`);
        setChallenge(res.data.challenge);
      } catch (e: any) {
        setError(e.response?.data?.error || "Failed to load challenge");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [api, selectedSquadId, challenge_id]);

  useEffect(() => {
    if (!challenge || !clerkUser) return;
    
    const maxScore = challenge.problems.reduce((sum, p) => sum + p.points, 0);
    const myParticipant = challenge.participants.find(p => p.user.clerkId === clerkUser.id);
    const currentScore = myParticipant?.score || 0;

    if (prevScore !== null && currentScore > prevScore && currentScore >= maxScore && maxScore > 0) {
      // Completed just now!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE156', '#4CAF50', '#FF5722']
      });
    }

    setPrevScore(currentScore);
  }, [challenge, clerkUser, prevScore]);

  if (!selectedSquadId) {
    return <div className="p-8 text-center font-bold">Select a squad first.</div>;
  }

  if (loading) {
    return <div className="p-12 text-center text-ink-500 font-bold animate-pulse">Loading challenge...</div>;
  }

  if (error || !challenge) {
    return (
      <div className="p-12 text-center">
        <ShieldAlert className="mx-auto mb-4 text-coral-500" size={48} />
        <h2 className="text-xl font-bold text-ink-900 mb-2">Challenge Not Found</h2>
        <p className="text-ink-600 mb-6">{error || "This challenge does not exist."}</p>
        <button onClick={() => navigate("/challenges")} className="text-brand-600 font-bold hover:underline">
          &larr; Back to Challenges
        </button>
      </div>
    );
  }

  const now = new Date();
  const end = new Date(challenge.endTime);
  const isExpired = now > end;
  
  const maxScore = challenge.problems.reduce((sum, p) => sum + p.points, 0);
  const myParticipant = challenge.participants.find(p => p.user?.clerkId === clerkUser?.id);
  const isCompleted = myParticipant && myParticipant.score >= maxScore && maxScore > 0;
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
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate("/challenges")}
          className="flex items-center gap-2 font-bold text-ink-500 hover:text-ink-800 transition"
        >
          <ArrowLeft size={16} /> Back to Challenges
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              showConfirm("Delete Challenge", "Are you sure you want to delete this challenge? This cannot be undone.", async () => {
                try {
                  await api.delete(`/challenges/${selectedSquadId}/${challenge_id}`);
                  showToast("Challenge deleted", "success");
                  navigate("/challenges");
                } catch (e: any) {
                  showToast(e.response?.data?.error || "Failed to delete challenge", "error");
                }
              });
            }}
            className="flex items-center gap-2 rounded-lg bg-coral-50 px-3 py-1.5 text-sm font-bold text-coral-600 hover:bg-coral-100 transition border-2 border-coral-200"
          >
            <Trash2 size={16} /> Delete
          </button>
          <button
            disabled={isRefreshing}
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await api.post(`/platformData/refresh/${selectedSquadId}`);
                const res = await api.get(`/challenges/${selectedSquadId}/${challenge_id}`);
                setChallenge(res.data.challenge);
              } catch (e) {
                console.error(e);
              } finally {
                setIsRefreshing(false);
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-bold text-ink-700 hover:bg-surface-3 transition border-2 border-border disabled:opacity-50"
          >
            <svg className={isRefreshing ? "animate-spin" : ""} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            {isRefreshing ? "Refreshing..." : "Refresh Stats"}
          </button>
        </div>
      </div>

      <div className={`mb-8 rounded-2xl border-2 p-8 shadow-card ${isActive ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface-0'}`}>
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-black text-ink-900 tracking-tight">{challenge.title}</h1>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${badgeClasses}`}>
            {badgeText}
          </span>
        </div>
        <p className="text-ink-700 mb-8">{challenge.description || "No description provided."}</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
            <Clock size={16} />
            {isExpired ? `Ended ${end.toLocaleString()}` : `Ends ${end.toLocaleString()}`}
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
            <Users size={16} />
            {challenge.participants.length} Participants
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Problems Column */}
        <div>
          <h2 className="text-xl font-bold text-ink-900 mb-4 flex items-center gap-2">
            Target Problems <span className="bg-ink-200 text-ink-800 rounded-full px-2 py-0.5 text-xs">{challenge.problems.length}</span>
          </h2>
          <div className="space-y-4">
            {challenge.problems.map((p, idx) => (
              <div key={p.id} className="rounded-xl border-2 border-border bg-surface-0 p-4 flex justify-between items-center hover:border-brand-300 transition">
                <div>
                  <div className="font-bold text-ink-900 mb-1 flex items-center gap-2">
                    <span className="text-ink-400 text-sm">#{idx + 1}</span> {p.problemName}
                  </div>
                  <div className="flex gap-2 text-xs font-bold">
                    <span className={`px-2 py-0.5 rounded-full ${
                      p.difficulty === 'easy' ? 'bg-mint-100 text-mint-700' :
                      p.difficulty === 'medium' ? 'bg-sun-100 text-sun-700' :
                      'bg-coral-100 text-coral-700'
                    }`}>
                      {p.difficulty.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                      {p.platform}
                    </span>
                  </div>
                </div>
                <a href={p.problemUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition">
                  <ExternalLink size={20} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Column */}
        <div>
          <h2 className="text-xl font-bold text-ink-900 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-sun-500" /> Leaderboard
          </h2>
          <div className="rounded-xl border-2 border-border bg-surface-0 overflow-hidden">
            {challenge.participants.length === 0 ? (
              <div className="p-8 text-center text-ink-500 font-bold">No participants yet.</div>
            ) : (
              challenge.participants.map((participant, index) => (
                <div key={participant.id} className={`flex items-center justify-between p-4 ${index !== challenge.participants.length - 1 ? 'border-b-2 border-border' : ''} ${index === 0 ? 'bg-sun-50/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-black w-6 text-center ${index === 0 ? 'text-sun-500 text-lg' : 'text-ink-400'}`}>
                      {index + 1}
                    </span>
                    <span className="font-bold text-ink-900">{participant.user.username}</span>
                  </div>
                  <div className="font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full text-sm">
                    {participant.score} pts
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
