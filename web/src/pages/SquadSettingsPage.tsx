import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { useDialog } from "../components/ui/Notifications";

type SquadInfo = {
  id: string;
  name: string;
  inviteCode: string;
  role: "admin" | "member";
};

export function SquadSettingsPage() {
  usePageTitle("Squad Settings | SquadCode");

  const navigate = useNavigate();
  const { showConfirm } = useDialog();
  const { getToken } = useAuth();
  const { user } = useUser();
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!selectedSquadId) return;
    setLoading(true);
    setError(null);
    try {
      const [squadsRes, dashRes] = await Promise.all([
        api.get("/squads/mine"),
        api.get(`/squads/${selectedSquadId}/dashboard`),
      ]);
      const mySquads = (squadsRes.data?.squads ?? []) as SquadInfo[];
      const found = mySquads.find((s) => s.id === selectedSquadId);
      if (found) {
        setSquad(found);
        setNewName(found?.name ?? "");
      }
      setMembers(dashRes.data?.members ?? []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquadId]);

  async function saveName() {
    if (!selectedSquadId || !newName.trim()) return;
    setSavingName(true);
    setActionError(null);
    try {
      await api.patch(`/squads/${selectedSquadId}`, { name: newName.trim() });
      setEditingName(false);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setSavingName(false);
    }
  }

  function copyInviteCode() {
    if (!squad?.inviteCode) return;
    void navigator.clipboard.writeText(squad.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyInviteLink() {
    if (!squad?.inviteCode) return;
    const link = `${window.location.origin}/join/${squad.inviteCode}`;
    void navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  function removeMember(userId: string, username: string) {
    if (!selectedSquadId) return;
    showConfirm(
      "Remove Member",
      `Remove ${username} from this squad?`,
      async () => {
        setRemoving(userId);
        setActionError(null);
        try {
          await api.delete(`/squads/${selectedSquadId}/members/${userId}`);
          await load();
        } catch (e) {
          setActionError(errorMessage(e));
        } finally {
          setRemoving(null);
        }
      }
    );
  }

  function leaveSquad() {
    if (!selectedSquadId) return;
    showConfirm(
      "Leave Squad",
      `Leave "${squad?.name}"?`,
      async () => {
        setLeaving(true);
        setActionError(null);
        try {
          await api.delete(`/squads/${selectedSquadId}/members/me`);
          setSelectedSquadId(null);
          navigate("/dashboard");
        } catch (e) {
          setActionError(errorMessage(e));
          setLeaving(false);
        }
      }
    );
  }

  function deleteSquad() {
    if (!selectedSquadId) return;
    showConfirm(
      "⚠️ Delete Squad",
      `PERMANENTLY delete "${squad?.name}"? This cannot be undone.`,
      async () => {
        setDeleting(true);
        setActionError(null);
        try {
          await api.delete(`/squads/${selectedSquadId}`);
          setSelectedSquadId(null);
          navigate("/dashboard");
        } catch (e) {
          setActionError(errorMessage(e));
          setDeleting(false);
        }
      }
    );
  }

  const myEmail = user?.primaryEmailAddress?.emailAddress;
  const myMember = members.find((m) => m.user.email === myEmail);
  const isAdmin = myMember?.role === "admin";

  if (!selectedSquadId) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-ink-600">
        Select a squad first to manage its settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-coral-500 bg-coral-300/20 p-6 text-coral-500 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold">Squad Settings</h1>
            <p className="mt-1 text-sm text-ink-600">Manage your squad, members, and invite code.</p>
          </div>
          {isAdmin && (
            <span className="rounded-full border-2 border-brand-500 bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-600">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Squad Info */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 space-y-5">
        <div className="text-sm font-bold">Squad Info</div>

        {/* Name */}
        <div>
          <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Squad Name</div>
          {editingName && isAdmin ? (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 outline-none focus:ring-2 focus:ring-brand-500/40"
                autoFocus
              />
              <button
                onClick={saveName}
                disabled={savingName || !newName.trim()}
                className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400 disabled:opacity-50"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-sm text-ink-400 hover:text-ink-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="font-bold text-lg text-ink-900">{squad?.name}</div>
              {isAdmin && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-brand-500 underline"
                >
                  Rename
                </button>
              )}
            </div>
          )}
        </div>

        {/* Invite Code */}
        <div>
          <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Invite Code</div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border-2 border-border bg-surface-2 px-4 py-2.5 font-mono text-xl font-extrabold tracking-[0.2em] text-ink-900">
              {squad?.inviteCode ?? "—"}
            </div>
            <button
              onClick={copyInviteCode}
              className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400"
            >
              {copied ? "✓ Copied!" : "Copy Code"}
            </button>
            <button
              onClick={copyInviteLink}
              className="rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition hover:bg-ink-100"
            >
              {copiedLink ? "✓ Link Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-400">Share this with teammates to invite them.</p>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold">Members ({members.length})</div>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                {m.user.profileImageUrl ? (
                  <img src={m.user.profileImageUrl} alt={m.nickname ?? m.user.username} className="h-9 w-9 rounded-full border-2 border-ink-900 object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full border-2 border-ink-900 bg-brand-100 flex items-center justify-center text-sm font-extrabold text-brand-600">
                    {(m.nickname ?? m.user.username).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold">{m.nickname ?? m.user.username}</div>
                  <div className="text-xs text-ink-400">{m.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  m.role === "admin"
                    ? "border-brand-500 bg-brand-100 text-brand-600"
                    : "border-border bg-surface-2 text-ink-600"
                }`}>
                  {m.role}
                </span>
                {isAdmin && m.role !== "admin" && m.user.email !== myEmail && (
                  <button
                    onClick={() => void removeMember(m.user.id, m.user.username)}
                    disabled={removing === m.user.id}
                    className="rounded-lg border border-coral-500 bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-500 hover:bg-coral-500 hover:text-white transition disabled:opacity-50"
                  >
                    {removing === m.user.id ? "..." : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border-2 border-coral-500 bg-coral-300/20 p-3 text-sm font-bold text-coral-500">
          {actionError}
        </div>
      )}

      {/* Danger Zone */}
      <div className="rounded-2xl border-2 border-coral-500 bg-coral-300/10 p-6">
        <div className="text-sm font-bold text-coral-500 mb-4">⚠️ Danger Zone</div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={leaveSquad}
            disabled={leaving}
            className="rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition hover:bg-ink-100 disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave Squad"}
          </button>
          {isAdmin && (
            <button
              onClick={deleteSquad}
              disabled={deleting}
              className="rounded-xl border-2 border-ink-900 bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition hover:bg-coral-400 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Squad"}
            </button>
          )}
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
