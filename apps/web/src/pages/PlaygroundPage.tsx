import { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../auth";
import { createApiClient } from "../lib/api";
import Editor from "@monaco-editor/react";

/* ─── language config ─── */
type Lang = "python" | "cpp";

const LANG_META: Record<Lang, { label: string; version: string }> = {
  python: { label: "Python 3", version: "3.x" },
  cpp: { label: "C++ 17", version: "17" },
};

const DEFAULT_CODE: Record<Lang, string> = {
  python: `# Welcome to SquadCode Playground
# Write your Python code here

def solve():
    n = int(input())
    arr = list(map(int, input().split()))
    print(sum(arr))

solve()`,
  cpp: `// Welcome to SquadCode Playground
// Write your C++ code here

#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    
    long long sum = 0;
    for (int x : arr) sum += x;
    cout << sum << endl;
    
    return 0;
}`,
};

/* ─── component ─── */
export function PlaygroundPage() {
  usePageTitle("Playground | SquadCode");

  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem("playground-code-python");
    return saved ?? DEFAULT_CODE.python;
  });
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [cpuTime, setCpuTime] = useState<string | null>(null);
  const [memory, setMemory] = useState<string | null>(null);

  /* persist code */
  useEffect(() => {
    localStorage.setItem(`playground-code-${lang}`, code);
  }, [code, lang]);

  /* switch language */
  function switchLang(next: Lang) {
    if (next === lang) return;
    setLang(next);
    const saved = localStorage.getItem(`playground-code-${next}`);
    setCode(saved ?? DEFAULT_CODE[next]);
    setStdout("");
    setStderr("");
    setExecTime(null);
    setExitCode(null);
    setCpuTime(null);
    setMemory(null);
  }

  /* clear */
  function handleClear() {
    setCode(DEFAULT_CODE[lang]);
    setStdin("");
    setStdout("");
    setStderr("");
    setExecTime(null);
    setExitCode(null);
    setCpuTime(null);
    setMemory(null);
  }

  /* run */
  async function handleRun() {
    setRunning(true);
    setStdout("");
    setStderr("");
    setExecTime(null);
    setExitCode(null);
    setCpuTime(null);
    setMemory(null);

    const start = performance.now();

    try {
      const res = await api.post("/execute", {
        language: lang,
        code,
        stdin,
      });

      const elapsed = Math.round(performance.now() - start);
      setExecTime(elapsed);

      const run = res.data;
      setStdout(run?.stdout ?? "");
      setStderr(run?.stderr ?? "");
      setExitCode(run?.code ?? run?.exitCode ?? null);
      setCpuTime(run?.cpuTime ?? null);
      setMemory(run?.memory ?? null);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        e?.response?.data?.stderr ??
        e?.message ??
        "Network error";
      setStderr(msg);
    } finally {
      setRunning(false);
    }
  }

  /* line count */
  const lineCount = code.split("\n").length;

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* ─── Header card ─── */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: title + language tabs */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>⚡</span>
              <h1 className="font-display text-lg font-bold">Playground</h1>
            </div>

            {/* Language tabs */}
            <div className="flex rounded-xl border-2 border-border bg-surface-2 p-1">
              {(["python", "cpp"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => switchLang(l)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                    lang === l
                      ? "bg-brand-500 text-white shadow-pop-sm border-2 border-ink-900"
                      : "text-ink-600 hover:text-ink-800 hover:bg-surface-0 border-2 border-transparent"
                  }`}
                >
                  {LANG_META[l].label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: action buttons + status */}
          <div className="flex items-center gap-3">
            {/* Status badge */}
            {running && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sun-500">
                <span className="h-2 w-2 rounded-full bg-sun-400 animate-pulse" />
                Running…
              </span>
            )}
            {!running && execTime !== null && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-500">
                <span className="h-2 w-2 rounded-full bg-mint-400" />
                {execTime}ms
                {exitCode !== null && exitCode !== 0 && (
                  <span className="text-coral-500 ml-1">(exit {exitCode})</span>
                )}
              </span>
            )}

            <button
              onClick={handleClear}
              disabled={running}
              className="rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100 disabled:opacity-50"
            >
              Clear
            </button>

            <button
              onClick={() => void handleRun()}
              disabled={running || code.trim().length === 0}
              className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50 flex items-center gap-2"
            >
              {running ? (
                <>
                  <Spinner />
                  Running…
                </>
              ) : (
                <>
                  <span aria-hidden>▶</span>
                  Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Editor + IO panels ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: 480 }}>
        {/* Code editor (3/5 width on desktop) */}
        <div className="lg:col-span-3 rounded-2xl border-2 border-border bg-surface-0 shadow-card flex flex-col overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-surface-2">
            <div className="flex items-center gap-2">
              {/* Fake traffic lights */}
              <span className="h-3 w-3 rounded-full bg-coral-400 border border-coral-500" />
              <span className="h-3 w-3 rounded-full bg-sun-400 border border-sun-500" />
              <span className="h-3 w-3 rounded-full bg-mint-400 border border-mint-500" />
            </div>
            <span className="text-xs font-mono text-ink-400">
              {LANG_META[lang].label}
              {cpuTime ? ` • CPU: ${cpuTime}s` : ""}
              {memory ? ` • Mem: ${memory}KB` : ""}
            </span>
          </div>

          {/* Editor body */}
          <div className="flex flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={lang}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </div>

        {/* Input / Output (2/5 width on desktop) */}
        <div className="lg:col-span-2 grid grid-rows-2 gap-6" style={{ minHeight: 480 }}>
          {/* Stdin */}
          <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border bg-surface-2">
              <span className="text-sm" aria-hidden>📥</span>
              <span className="text-sm font-bold text-ink-800">Input</span>
              <span className="ml-auto text-xs text-ink-400 font-mono">stdin</span>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none bg-surface-0 p-4 font-mono text-sm leading-6 text-ink-800 outline-none placeholder:text-ink-400"
              placeholder={"Enter input here…\ne.g.\n5\n1 2 3 4 5"}
            />
          </div>

          {/* Stdout / Stderr */}
          <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border bg-surface-2">
              <span className="text-sm" aria-hidden>📤</span>
              <span className="text-sm font-bold text-ink-800">Output</span>
              {exitCode !== null && (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${
                    exitCode === 0
                      ? "bg-mint-300/30 text-mint-500 border border-mint-400"
                      : "bg-coral-300/30 text-coral-500 border border-coral-400"
                  }`}
                >
                  exit {exitCode}
                </span>
              )}
              {exitCode === null && (
                <span className="ml-auto text-xs text-ink-400 font-mono">stdout</span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-6">
              {running && (
                <div className="flex items-center gap-2 text-sun-500 text-sm font-bold">
                  <Spinner />
                  Executing…
                </div>
              )}

              {!running && !stdout && !stderr && execTime === null && (
                <span className="text-ink-400">
                  Run your code to see output here…
                </span>
              )}

              {!running && !stdout && !stderr && execTime !== null && (
                <span className="text-ink-400">
                  (no output)
                </span>
              )}

              {!running && stdout && (
                <pre className="whitespace-pre-wrap text-ink-800">{stdout}</pre>
              )}

              {!running && stderr && (
                <pre className="whitespace-pre-wrap text-coral-500 mt-2 border-t border-border pt-2">
                  {stderr}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer info ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400 px-1">
        <span>
          Powered by Judge0
        </span>
        <span className="font-mono">
          Tab = 4 spaces • {lineCount} line{lineCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

/* ─── tiny spinner ─── */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
