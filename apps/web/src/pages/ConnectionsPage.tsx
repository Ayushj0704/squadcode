import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";

type Connection = {
  id: string;
  platform: "codeforces" | "leetcode" | "github";
  username: string;
  verified: boolean;
  verificationToken: string | null;
  tokenExpiresAt: string | null;
};

export function ConnectionsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [status, setStatus] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const [cfUser, setCfUser] = useState("");
  const [lcUser, setLcUser] = useState("");
  const [ghUser, setGhUser] = useState("");

  async function syncMe() {
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const username = user?.username ?? user?.firstName ?? "user";
    if (!email) return;
    await api.post("/auth/sync", { username, email });
  }

  async function loadStatus() {
    setStatus(null);
    try {
      await syncMe();
      const res = await api.get("/connections/status");
      setConnections(res.data.connections);
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    }
  }

  async function initiate(platform: "codeforces" | "leetcode" | "github", username: string) {
    setStatus(null);
    try {
      await syncMe();
      await api.post("/connections/initiate", { platform, username });
      await loadStatus();
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    }
  }

  async function verify(platform: "codeforces" | "leetcode", username: string) {
    setStatus(null);
    try {
      await api.post("/connections/verify", { platform, username });
      await loadStatus();
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    }
  }

  const cfConn = connections.find((c) => c.platform === "codeforces") ?? null;
  const lcConn = connections.find((c) => c.platform === "leetcode") ?? null;
  const ghConn = connections.find((c) => c.platform === "github") ?? null;

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Connections</h1>
          <p className="mt-1 text-sm text-slate-300">
            Connect accounts. Only verified connections are used for squad dashboards.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {status ? (
        <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 p-4 text-rose-200 text-sm">
          {status}
        </div>
      ) : null}

      <ConnectionCard
        title="Codeforces"
        subtitle="Paste token anywhere visible on your profile page, then verify."
        value={cfUser}
        setValue={setCfUser}
        existing={cfConn}
        onInitiate={() => initiate("codeforces", cfUser.trim())}
        onVerify={() => verify("codeforces", cfConn?.username ?? cfUser.trim())}
      />

      <ConnectionCard
        title="LeetCode"
        subtitle="Paste the token in your LeetCode Display Name temporarily, then click Verify. You can change it back after."
        value={lcUser}
        setValue={setLcUser}
        existing={lcConn}
        onInitiate={() => initiate("leetcode", lcUser.trim())}
        onVerify={() => verify("leetcode", lcConn?.username ?? lcUser.trim())}
      />

      <ConnectionCard
        title="GitHub"
        subtitle="No token needed in this build. Just add your username."
        value={ghUser}
        setValue={setGhUser}
        existing={ghConn}
        onInitiate={() => initiate("github", ghUser.trim())}
      />
    </div>
  );
}

function ConnectionCard(props: {
  title: string;
  subtitle: string;
  value: string;
  setValue: (v: string) => void;
  existing: Connection | null;
  onInitiate: () => void;
  onVerify?: () => void;
}) {
  const token = props.existing?.verificationToken ?? null;
  const expiresAt = props.existing?.tokenExpiresAt ?? null;
  const verified = props.existing?.verified ?? false;
  const username = props.existing?.username ?? "";

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{props.title}</div>
          <div className="mt-1 text-sm text-slate-300">{props.subtitle}</div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            verified
              ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
              : "border-slate-800 bg-slate-950/30 text-slate-300"
          }`}
        >
          {verified ? "verified" : "not verified"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
          className="sm:col-span-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
          placeholder={`${props.title} username`}
        />
        <button
          onClick={props.onInitiate}
          disabled={!props.value.trim()}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {props.existing ? "Re-initiate" : "Initiate"}
        </button>
      </div>

      {username ? (
        <div className="mt-3 text-sm text-slate-300">
          Current: <span className="text-slate-100 font-semibold">{username}</span>
        </div>
      ) : null}

      {token ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-400">Verification token</div>
          <div className="mt-1 font-mono text-slate-100">{token}</div>
          {expiresAt ? (
            <div className="mt-1 text-xs text-slate-400">Expires at {new Date(expiresAt).toLocaleString()}</div>
          ) : null}
          {props.onVerify ? (
            <button
              onClick={props.onVerify}
              className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              Verify
            </button>
          ) : null}
        </div>
      ) : null}
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
