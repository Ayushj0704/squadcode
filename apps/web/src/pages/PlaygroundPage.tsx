import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";

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
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [cpuTime, setCpuTime] = useState<string | null>(null);
  const [memory, setMemory] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  /* sync scroll between line-numbers and editor */
  const syncScroll = useCallback(() => {
    if (editorRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  /* switch language */
  function switchLang(next: Lang) {
    if (next === lang) return;
    setLang(next);
    setCode(DEFAULT_CODE[next]);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setStderr(msg);
    } finally {
      setRunning(false);
    }
  }

  /* line count */
  const lineCount = code.split("\n").length;

  /* handle tab key and ctrl+/ in editor */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    } else if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      
      const before = code.substring(0, start);
      const selected = code.substring(start, end);
      const after = code.substring(end);
      
      const isCpp = lang === "cpp";
      const commentToken = isCpp ? "// " : "# ";
      
      // If we have a selection spanning multiple lines
      if (selected.includes("\\n") || selected.length > 0) {
         let lineStart = before.lastIndexOf("\\n") + 1;
         if (lineStart === 0 && before.length > 0 && before[0] !== '\\n') {
           lineStart = 0;
         }
         
         const fullSelectedText = code.substring(lineStart, end);
         const lines = fullSelectedText.split("\\n");
         
         const allCommented = lines.every(l => l.trim() === "" || l.trimStart().startsWith(commentToken.trim()));
         
         const newLines = lines.map(line => {
           if (line.trim() === "") return line;
           if (allCommented) {
             return line.replace(commentToken, "").replace(commentToken.trim(), "");
           } else {
             return commentToken + line;
           }
         });
         
         const newCode = code.substring(0, lineStart) + newLines.join("\\n") + after;
         setCode(newCode);
         requestAnimationFrame(() => {
            ta.selectionStart = lineStart;
            ta.selectionEnd = lineStart + newLines.join("\\n").length;
         });
      } else {
         // Single line
         const lineStart = before.lastIndexOf("\\n") + 1;
         const lineEndStr = after.indexOf("\\n");
         const lineEnd = lineEndStr === -1 ? code.length : end + lineEndStr;
         
         const line = code.substring(lineStart, lineEnd);
         let newLine = line;
         if (line.trimStart().startsWith(commentToken.trim())) {
            newLine = line.replace(commentToken, "").replace(commentToken.trim(), "");
         } else {
            newLine = commentToken + line;
         }
         
         const newCode = code.substring(0, lineStart) + newLine + code.substring(lineEnd);
         setCode(newCode);
         requestAnimationFrame(() => {
            const diff = newLine.length - line.length;
            ta.selectionStart = ta.selectionEnd = start + diff;
         });
      }
    }
  }

  /* keep textarea height consistent */
  useEffect(() => {
    syncScroll();
  }, [code, syncScroll]);

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
              className="rounded-xl border-2 border-ink-900 bg-white px-4 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100 disabled:opacity-50"
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
          <div className="flex flex-1 overflow-hidden">
            {/* Line numbers */}
            <div
              ref={lineNumbersRef}
              className="select-none overflow-hidden bg-surface-2 text-right px-3 py-4 font-mono text-xs leading-6 text-ink-400 border-r-2 border-border shrink-0"
              style={{ minWidth: 48 }}
              aria-hidden
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 resize-none bg-surface-0 p-4 font-mono text-sm leading-6 text-ink-800 outline-none placeholder:text-ink-400"
              placeholder="Write your code here..."
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
          Powered by JDoodle
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
