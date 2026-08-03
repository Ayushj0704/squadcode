import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSquadStore } from '../store/squadStore';
import { createApiClient } from '../lib/api';
import { Plus, CheckCircle, MessageSquare, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { useToast, useDialog } from "../components/ui/Notifications";

type Completion = { id: string; userId: string; completedAt: string; user?: { username: string } };
type Problem = { id: string; problemName: string; platform: string; problemUrl: string; difficulty: 'easy'|'medium'|'hard'; completions: Completion[]; tags: string[] };
type Sheet = { id: string; title: string; createdAt: string; dueDate?: string | null; problems: Problem[] };

export function SheetDetailPage() {
  const { sheet_id } = useParams<{ sheet_id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { selectedSquadId } = useSquadStore();
  const { showToast } = useToast();
  const { showConfirm } = useDialog();
  const { showPrompt } = useDialog();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  
  // Add problem state
  const [isAdding, setIsAdding] = useState(false);
  const [newProblem, setNewProblem] = useState({ problemName: '', platform: 'LeetCode', problemUrl: '', difficulty: 'easy', tags: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSheet = async () => {
    if (!selectedSquadId || !sheet_id) return;
    try {
      const api = createApiClient(() => getToken());
      const res = await api.get(`/sheets/detail/${sheet_id}`);
      setSheet(res.data.sheet ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [selectedSquadId, sheet_id, getToken]);

  const handleComplete = async (problemId: string) => {
    try {
      const api = createApiClient(() => getToken());
      await api.post(`/sheets/${sheet_id}/problems/${problemId}/complete`, {});
      await fetchSheet();
    } catch (error) {
      console.error('Failed to mark complete', error);
    }
  };

  const handleUndoComplete = async (problemId: string) => {
    try {
      const api = createApiClient(() => getToken());
      await api.delete(`/sheets/${sheet_id}/problems/${problemId}/complete`);
      await fetchSheet();
    } catch (error) {
      console.error('Failed to undo complete', error);
    }
  };

  const handleDeleteProblem = (problemId: string) => {
    showConfirm(
      "Delete Problem",
      "Are you sure you want to delete this problem?",
      async () => {
        try {
          const api = createApiClient(() => getToken());
          await api.delete(`/sheets/${sheet_id}/problems/${problemId}`);
          await fetchSheet();
        } catch (error) {
          console.error('Failed to delete problem', error);
          showToast('Failed to delete problem', 'error');
        }
      }
    );
  };

  const handleDeleteSheet = () => {
    showConfirm(
      "⚠️ Delete Sheet",
      "Are you sure you want to delete this sheet? This cannot be undone.",
      async () => {
        try {
          const api = createApiClient(() => getToken());
          await api.delete(`/sheets/${sheet_id}`);
          navigate('/sheets');
        } catch (error) {
          console.error('Failed to delete sheet', error);
          showToast('Failed to delete sheet', 'error');
        }
      }
    );
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet_id) return;
    try {
      setIsSubmitting(true);
      const api = createApiClient(() => getToken());
      
      const tagsArray = newProblem.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      await api.post(`/sheets/${sheet_id}/problems`, {
        problemName: newProblem.problemName,
        platform: newProblem.platform,
        problemUrl: newProblem.problemUrl,
        difficulty: newProblem.difficulty,
        tags: tagsArray
      });
      
      setNewProblem({ problemName: '', platform: 'LeetCode', problemUrl: '', difficulty: 'easy', tags: '' });
      setIsAdding(false);
      await fetchSheet();
    } catch (error) {
      console.error('Failed to add problem', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!sheet) {
    return <div className="p-8 text-center text-ink-600">Sheet not found.</div>;
  }

  // Calculate progress
  const problems = sheet.problems ?? [];
  const totalProblems = problems.length;
  const completedProblems = problems.filter(p => p.completions && p.completions.length > 0).length;
  const progressPct = totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0;

  const filteredProblems = problems.filter(p => difficultyFilter === 'all' || p.difficulty === difficultyFilter);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-mint-600 bg-mint-100 border-mint-200';
      case 'medium': return 'text-sun-600 bg-sun-100 border-sun-200';
      case 'hard': return 'text-coral-600 bg-coral-100 border-coral-200';
      default: return 'text-ink-600 bg-ink-100 border-ink-200';
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8 rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">{sheet.title}</h1>
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="text-sm font-medium text-ink-600">
                Created: {new Date(sheet.createdAt).toLocaleDateString()}
              </span>
              {sheet.dueDate && (
                <span className="flex items-center gap-1 rounded-md bg-coral-50 px-2 py-0.5 text-sm font-bold text-coral-600 border border-coral-200">
                  <Calendar className="h-4 w-4" />
                  Due: {new Date(sheet.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSheet}
              className="flex items-center gap-2 rounded-xl border-2 border-coral-200 bg-coral-50 px-4 py-2 text-sm font-bold text-coral-600 transition hover:bg-coral-100"
            >
              Delete Sheet
            </button>
            <button
              onClick={async () => {
                const url = await showPrompt('Import from LeetCode', 'Paste a LeetCode Study Plan or List URL...');
                if (url) {
                  showToast('Fetching problems from LeetCode... (Feature coming soon!)', 'info');
                  // Stub: in a real implementation this would call a new backend endpoint
                  setTimeout(() => window.location.reload(), 1000);
                }
              }}
              className="hidden sm:flex items-center gap-2 rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-100"
            >
              <Plus className="h-4 w-4" />
              Import LC List
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400"
            >
              <Plus className="h-4 w-4" />
              Add Problem
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-ink-800">
            <span>Team Progress</span>
            <span>{completedProblems} of {totalProblems} ({progressPct}%)</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div 
              className="h-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add Problem Form */}
      {isAdding && (
        <div className="mb-8 rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card">
          <h2 className="mb-4 text-xl font-bold text-ink-900">Add New Problem</h2>
          <form onSubmit={handleAddProblem} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-ink-700">Problem Name</label>
                <input
                  required
                  type="text"
                  value={newProblem.problemName}
                  onChange={e => setNewProblem({...newProblem, problemName: e.target.value})}
                  className="w-full rounded-xl border-2 border-ink-200 p-2 outline-none focus:border-brand-500"
                  placeholder="Two Sum"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-ink-700">URL</label>
                <input
                  required
                  type="url"
                  value={newProblem.problemUrl}
                  onChange={e => setNewProblem({...newProblem, problemUrl: e.target.value})}
                  className="w-full rounded-xl border-2 border-ink-200 p-2 outline-none focus:border-brand-500"
                  placeholder="https://leetcode.com/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-ink-700">Platform</label>
                <select
                  required
                  value={newProblem.platform}
                  onChange={e => setNewProblem({...newProblem, platform: e.target.value})}
                  className="w-full rounded-xl border-2 border-ink-200 p-2 outline-none focus:border-brand-500"
                >
                  <option value="" disabled>Select platform</option>
                  <option value="LeetCode">LeetCode</option>
                  <option value="Codeforces">Codeforces</option>
                  <option value="HackerRank">HackerRank</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="GeeksForGeeks">GeeksForGeeks</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-ink-700">Difficulty</label>
                <select
                  value={newProblem.difficulty}
                  onChange={e => setNewProblem({...newProblem, difficulty: e.target.value as 'easy'|'medium'|'hard'})}
                  className="w-full rounded-xl border-2 border-ink-200 p-2 outline-none focus:border-brand-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-bold text-ink-700">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newProblem.tags}
                  onChange={e => setNewProblem({...newProblem, tags: e.target.value})}
                  className="w-full rounded-xl border-2 border-ink-200 p-2 outline-none focus:border-brand-500"
                  placeholder="array, hash-table, two-pointers"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Save Problem'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['all', 'easy', 'medium', 'hard'] as const).map(diff => (
          <button
            key={diff}
            onClick={() => setDifficultyFilter(diff)}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${
              difficultyFilter === diff
                ? 'border-ink-900 bg-brand-500 text-white shadow-pop-sm'
                : 'border-transparent bg-surface-0 text-ink-600 hover:bg-surface-2'
            }`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Problems List */}
      <div className="space-y-4">
        {filteredProblems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink-200 py-12 text-center text-ink-500">
            No problems found for this filter.
          </div>
        ) : (
          filteredProblems.map((problem) => {
            const hasCompleted = problem.completions?.some(c => c.userId === user?.id);

            return (
              <div key={problem.id} className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-surface-0 p-5 shadow-card sm:flex-row sm:items-center">
                
                <div className="flex-1">
                  <div className="flex items-start justify-between sm:justify-start sm:gap-3">
                    <h3 className="text-lg font-bold text-ink-900">
                      <a href={problem.problemUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brand-500">
                        {problem.problemName}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </h3>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-700">
                      {problem.platform}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold capitalize ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-l-2 border-ink-100 pl-2">
                        {problem.tags.map((tag, idx) => (
                          <span key={idx} className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Completions avatares */}
                  {problem.completions && problem.completions.length > 0 && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-xs text-ink-500 mr-1">Completed by:</span>
                      <div className="flex -space-x-2">
                        {problem.completions.map(comp => (
                          <div 
                            key={comp.id} 
                            title={comp.user?.username || comp.userId}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-0 bg-ink-200 text-[10px] font-bold text-ink-700"
                          >
                            {(comp.user?.username || comp.userId || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t-2 border-ink-50 pt-4 sm:border-t-0 sm:pt-0">
                  <button
                    onClick={() => navigate('/threads', { state: { prefillTitle: problem.problemName, prefillLinkedProblemId: problem.id } })}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-ink-200 bg-surface-0 px-3 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-100 sm:flex-none"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Discuss &rarr;
                  </button>
                  <button
                    onClick={() => handleDeleteProblem(problem.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-coral-200 bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600 transition hover:bg-coral-100 sm:flex-none"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => hasCompleted ? handleUndoComplete(problem.id) : handleComplete(problem.id)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition sm:flex-none ${
                      hasCompleted
                        ? 'border-mint-600 bg-mint-500 text-white shadow-pop hover:bg-mint-600 active:translate-y-1 active:shadow-none'
                        : 'border-ink-900 bg-brand-500 text-white shadow-pop hover:bg-brand-400 active:translate-y-1 active:shadow-none'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {hasCompleted ? 'Undo Done' : 'Mark Done'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
