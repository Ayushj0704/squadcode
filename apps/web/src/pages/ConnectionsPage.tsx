import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";

type Connection = {
  id: string;
  platform: "codeforces" | "leetcode" | "github";
  username: string;
  verified: boolean;
  verificationToken: string | null;
  tokenExpiresAt: string | null;
};

export function ConnectionsPage() {
  usePageTitle("Verified Connections | SquadCode");

  const { getToken } = useAuth();
  const navigate = useNavigate();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [status, setStatus] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [cfUser, setCfUser] = useState("");
  const [lcUser, setLcUser] = useState("");
  const [ghUser, setGhUser] = useState("");

  async function loadStatus() {
    setStatus(null);
    setNeedsOnboarding(false);
    try {
      const res = await api.get("/connections/status");
      setConnections(res.data.connections);
    } catch (e: unknown) {
      if (isNotSyncedError(e)) {
        setConnections([]);
        setNeedsOnboarding(true);
        return;
      }
      setStatus(errorMessage(e));
    }
  }

  async function initiate(platform: "codeforces" | "leetcode" | "github", username: string) {
    setStatus(null);
    setNeedsOnboarding(false);
    try {
      await api.post("/connections/initiate", { platform, username });
      await loadStatus();
    } catch (e: unknown) {
      if (isNotSyncedError(e)) {
        setNeedsOnboarding(true);
        return;
      }
      setStatus(errorMessage(e));
    }
  }

  async function verify(platform: "codeforces" | "leetcode", username: string) {
    setStatus(null);
    setNeedsOnboarding(false);
    try {
      await api.post("/connections/verify", { platform, username });
      await loadStatus();
    } catch (e: unknown) {
      if (isNotSyncedError(e)) {
        setNeedsOnboarding(true);
        return;
      }
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
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-bold">Verified connections</h1>
          <p className="mt-1 text-sm text-ink-600">
            Connect accounts. Only verified connections are used for squad dashboards.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
        >
          Refresh
        </button>
      </div>

      {needsOnboarding ? (
        <div className="rounded-2xl border-2 border-sun-500 bg-sun-300/40 p-4 text-ink-800 text-sm flex items-center justify-between gap-4">
          <div>
            <div className="font-bold">Finish onboarding first</div>
            <div className="mt-1 text-ink-600">
              Set your SquadCode username on the Onboarding page before connecting platforms.
            </div>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="shrink-0 rounded-xl border-2 border-ink-900 bg-sun-400 px-3 py-2 text-sm font-bold text-ink-900 shadow-pop-sm hover:bg-sun-300 transition active:translate-y-0.5 active:shadow-none"
          >
            Go to Onboarding
          </button>
        </div>
      ) : null}

      {status ? (
        <div className="rounded-2xl border-2 border-coral-500 bg-coral-300/40 p-4 text-coral-500 font-bold text-sm">
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
        instructions={[
          "1. Go to codeforces.com and log in",
          "2. Click your username top right -> Settings -> Social tab",
          "3. Paste the token in the First Name (English) field",
          "4. Click Save Changes on Codeforces",
          "5. Come back here immediately and click Verify",
          "6. After verified, remove the token and restore your name"
        ]}
      />

      <ConnectionCard
        title="LeetCode"
        subtitle="Paste the token in your LeetCode Display Name temporarily, then click Verify. You can change it back after."
        value={lcUser}
        setValue={setLcUser}
        existing={lcConn}
        onInitiate={() => initiate("leetcode", lcUser.trim())}
        onVerify={() => verify("leetcode", lcConn?.username ?? lcUser.trim())}
        instructions={[
          "1. Go to leetcode.com and log in",
          "2. Click your profile picture -> Settings -> Account",
          "3. Change your Display Name to the token",
          "4. Save changes on LeetCode",
          "5. Come back here immediately and click Verify",
          "6. After verified, change your Display Name back"
        ]}
      />

      <ConnectionCard
        title="GitHub"
        subtitle="No token needed in this build. Just add your username."
        value={ghUser}
        setValue={setGhUser}
        existing={ghConn}
        onInitiate={() => initiate("github", ghUser.trim())}
        instructions={[
          "No verification needed. Just enter your GitHub username and it will be connected automatically."
        ]}
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
  instructions: string[];
}) {
  const token = props.existing?.verificationToken ?? null;
  const expiresAt = props.existing?.tokenExpiresAt ?? null;
  const verified = props.existing?.verified ?? false;
  const username = props.existing?.username ?? "";
  const showHowTo = props.instructions.length > 0;

  return (
    <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold">{props.title}</div>
          <div className="mt-1 text-sm text-ink-600">{props.subtitle}</div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            verified
              ? "border-mint-500 bg-mint-300/50 text-mint-500"
              : "border-border-strong bg-black/20 text-ink-600"
          }`}
        >
          {verified ? "verified" : "not verified"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
          className="sm:col-span-2 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
          placeholder={`${props.title} username`}
        />
        <button
          onClick={props.onInitiate}
          disabled={!props.value.trim()}
          className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
        >
          {props.existing ? "Re-initiate" : "Initiate"}
        </button>
      </div>

      {username ? (
        <div className="mt-3 text-sm text-ink-600">
          Current: <span className="text-ink-800 font-bold">{username}</span>
        </div>
      ) : null}

      {token ? (
        <div className="mt-4 rounded-xl border-2 border-border bg-surface-2 p-4">
          <div className="text-xs text-ink-400">Verification token</div>
          <div className="mt-1 font-mono text-ink-800">{token}</div>
          {expiresAt ? (
            <div className="mt-1 text-xs text-ink-400">Expires at {new Date(expiresAt).toLocaleString()}</div>
          ) : null}
          {props.onVerify ? (
            <button
              onClick={props.onVerify}
              className="mt-3 rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
            >
              Verify
            </button>
          ) : null}

          {showHowTo ? (
            <details className="mt-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-ink-800">
                How to verify?
              </summary>
              <div className="mt-3 rounded-xl border border-border-strong bg-black/20 p-4 text-sm text-ink-600">
                <div className="grid grid-cols-1 gap-1">
                  {props.instructions.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : showHowTo ? (
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-sm font-bold text-ink-800">
            How to verify?
          </summary>
          <div className="mt-3 rounded-xl border-2 border-border bg-surface-2 p-4 text-sm text-ink-600">
            <div className="grid grid-cols-1 gap-1">
              {props.instructions.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </details>
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

function isNotSyncedError(e: unknown) {
  if (!axios.isAxiosError(e)) return false;
  const data = e.response?.data as { error?: string } | undefined;
  return e.response?.status === 400 && (data?.error ?? "").toLowerCase().includes("not synced");
}
