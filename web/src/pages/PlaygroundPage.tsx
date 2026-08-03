import { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePlan } from "../lib/usePlan";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";

/* ─── language config ─── */
type Lang = "python" | "cpp" | "java" | "javascript" | "go" | "rust";
type Mode = "run" | "submit";
type TemplateKey = "blank" | "cp" | "leetcode";

type Snippet = {
  id: string;
  shareCode: string;
  name: string;
  language: string;
  code: string;
  isShared: boolean;
};

const LANG_META: Record<Lang, { label: string; version: string }> = {
  python: { label: "Python 3", version: "3.x" },
  cpp: { label: "C++ 17", version: "17" },
  java: { label: "Java", version: "13" },
  javascript: { label: "JavaScript", version: "Node.js" },
  go: { label: "Go", version: "1.13" },
  rust: { label: "Rust", version: "1.40" },
};

const DEFAULT_CODE: Record<Lang, string> = {
  python: `# Welcome to SquadCode Playground\n# Write your Python code here\n\ndef solve():\n    n = int(input())\n    arr = list(map(int, input().split()))\n    print(sum(arr))\n\nsolve()`,
  cpp: `// Welcome to SquadCode Playground\n// Write your C++ code here\n\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> arr(n);\n    for (int i = 0; i < n; i++) cin >> arr[i];\n    \n    long long sum = 0;\n    for (int x : arr) sum += x;\n    cout << sum << endl;\n    \n    return 0;\n}`,
  java: `// Welcome to SquadCode Playground\n// Write your Java code here\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        long sum = 0;\n        for(int i=0; i<n; i++) {\n            sum += sc.nextInt();\n        }\n        System.out.println(sum);\n    }\n}`,
  javascript: `// Welcome to SquadCode Playground\n// Write your JavaScript code here\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (input.length > 1) {\n  const arr = input[1].split(' ').map(Number);\n  console.log(arr.reduce((a, b) => a + b, 0));\n}`,
  go: `// Welcome to SquadCode Playground\n// Write your Go code here\npackage main\nimport (\n\t"fmt"\n)\nfunc main() {\n\tvar n int\n\tfmt.Scan(&n)\n\tvar sum int64 = 0\n\tfor i := 0; i < n; i++ {\n\t\tvar x int64\n\t\tfmt.Scan(&x)\n\t\tsum += x\n\t}\n\tfmt.Println(sum)\n}`,
  rust: `// Welcome to SquadCode Playground\n// Write your Rust code here\nuse std::io;\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_line(&mut input).unwrap();\n    let mut input2 = String::new();\n    io::stdin().read_line(&mut input2).unwrap();\n    let sum: i64 = input2.split_whitespace().map(|s| s.parse::<i64>().unwrap()).sum();\n    println!("{}", sum);\n}`,
};

const TEMPLATES: Record<TemplateKey, Record<Lang, string>> = {
  blank: DEFAULT_CODE,
  cp: {
    python: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    t = int(input().strip())\n    for _ in range(t):\n        n = int(input().strip())\n        arr = list(map(int, input().split()))\n        print(sum(arr))\n\nif __name__ == "__main__":\n    solve()`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int t;\n    cin >> t;\n    while (t--) {\n        int n;\n        cin >> n;\n        vector<int> a(n);\n        for (int i = 0; i < n; ++i) cin >> a[i];\n        long long sum = 0;\n        for (int x : a) sum += x;\n        cout << sum << '\\n';\n    }\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int t = sc.nextInt();\n        while (t-- > 0) {\n            int n = sc.nextInt();\n            long sum = 0;\n            for(int i=0; i<n; i++) {\n                sum += sc.nextInt();\n            }\n            System.out.println(sum);\n        }\n    }\n}`,
    javascript: `const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nlet line = 0;\nconst t = Number(input[line++]);\nfor(let i = 0; i < t; i++) {\n  const n = Number(input[line++]);\n  const arr = input[line++].split(' ').map(Number);\n  console.log(arr.reduce((a, b) => a + b, 0));\n}`,
    go: `package main\nimport (\n\t"fmt"\n)\nfunc main() {\n\tvar t int\n\tfmt.Scan(&t)\n\tfor i := 0; i < t; i++ {\n\t\tvar n int\n\t\tfmt.Scan(&n)\n\t\tvar sum int64 = 0\n\t\tfor j := 0; j < n; j++ {\n\t\t\tvar x int64\n\t\t\tfmt.Scan(&x)\n\t\t\tsum += x\n\t\t}\n\t\tfmt.Println(sum)\n\t}\n}`,
    rust: `use std::io;\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_line(&mut input).unwrap();\n    let t: i32 = input.trim().parse().unwrap();\n    for _ in 0..t {\n        let mut input1 = String::new();\n        io::stdin().read_line(&mut input1).unwrap();\n        let mut input2 = String::new();\n        io::stdin().read_line(&mut input2).unwrap();\n        let sum: i64 = input2.split_whitespace().map(|s| s.parse::<i64>().unwrap()).sum();\n        println!("{}", sum);\n    }\n}`,
  },
  leetcode: {
    python: `class Solution:\n    def solve(self):\n        pass`,
    cpp: `class Solution {\npublic:\n    int solve() {\n        return 0;\n    }\n};`,
    java: `class Solution {\n    public int solve() {\n        return 0;\n    }\n}`,
    javascript: `var Solution = function() {\n};\nSolution.prototype.solve = function() {\n    return 0;\n};`,
    go: `func solve() int {\n    return 0\n}`,
    rust: `impl Solution {\n    pub fn solve() -> i32 {\n        0\n    }\n}`,
  },
};

/* ─── component ─── */
export function PlaygroundPage() {
  usePageTitle("Playground | SquadCode");

  return <PlaygroundContent />;
}

function PlaygroundContent() {
  const navigate = useNavigate();
  const { plan } = usePlan();

  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [lang, setLang] = useState<Lang>("python");
  const [mode, setMode] = useState<Mode>("run");
  const [template, setTemplate] = useState<TemplateKey>("blank");
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
  const [snippetName, setSnippetName] = useState("");
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetMessage, setSnippetMessage] = useState<string | null>(null);
  const [loadCode, setLoadCode] = useState("");
  const [runLimitReached, setRunLimitReached] = useState(false);
  /* persist code */
  useEffect(() => {
    localStorage.setItem(`playground-code-${lang}`, code);
  }, [code, lang]);

  useEffect(() => {
    let alive = true;
    async function loadSnippets() {
      try {
        const res = await api.get("/snippets", {
          params: selectedSquadId ? { squadId: selectedSquadId } : undefined,
        });
        if (alive) setSnippets((res.data.snippets ?? []) as Snippet[]);
      } catch {
        if (alive) setSnippets([]);
      }
    }
    void loadSnippets();
    return () => {
      alive = false;
    };
  }, [api, selectedSquadId]);

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
    setTemplate("blank");
    setStdin("");
    setStdout("");
    setStderr("");
    setExecTime(null);
    setExitCode(null);
    setCpuTime(null);
    setMemory(null);
  }

  function applyTemplate(next: TemplateKey) {
    setTemplate(next);
    setCode(TEMPLATES[next][lang]);
  }

  async function saveSnippet() {
    setSnippetMessage(null);
    try {
      const res = await api.post("/snippets", {
        name: snippetName.trim() || "Untitled snippet",
        language: lang,
        code,
        squadId: selectedSquadId ?? null,
        isShared: true,
      });
      setSnippets((prev) => [res.data.snippet as Snippet, ...prev]);
      setSnippetMessage("Saved and shareable");
    } catch (err: any) {
      setSnippetMessage(err?.response?.data?.error || "Failed to save snippet");
    }
  }

  async function loadSnippetByCode() {
    setSnippetMessage(null);
    if (!loadCode.trim()) return;
    try {
      const res = await api.get(`/snippets/${loadCode.trim()}`);
      const snip = res.data.snippet as Snippet;
      setLang(snip.language as Lang);
      setCode(snip.code);
      setSnippetName(snip.name);
      setSnippetMessage("Snippet loaded!");
      setLoadCode("");
    } catch (err) {
      setSnippetMessage("Snippet not found");
    }
  }

  /* run */
  async function handleRun() {
    setRunLimitReached(false);
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
      if (e?.response?.status === 403) {
        setRunLimitReached(true);
      } else {
        setStderr(msg);
      }
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

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-ink-600">Preset</label>
              <select
                value={template}
                onChange={(e) => applyTemplate(e.target.value as TemplateKey)}
                className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="blank">Blank</option>
                <option value="cp">CP template</option>
                <option value="leetcode">LeetCode template</option>
              </select>

              <label className="text-xs font-bold text-ink-600">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="run">Run</option>
                <option value="submit">Submit</option>
              </select>
            </div>

            {/* Language tabs */}
            <div className="flex rounded-xl border-2 border-border bg-surface-2 p-1">
              {(["python", "cpp", "java"] as Lang[]).map((l) => (
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
                  {mode === "run" ? "Run" : "Submit"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        {/* Snippet Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 border-t-2 border-border pt-4">
          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              value={snippetName}
              onChange={(e) => setSnippetName(e.target.value)}
              className="w-full sm:w-48 rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm font-bold text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              placeholder="Snippet name"
            />
            <button
              onClick={() => void saveSnippet()}
              className="shrink-0 rounded-xl border-2 border-ink-900 bg-sun-400 px-4 py-2 text-sm font-bold text-ink-900 shadow-pop transition hover:bg-sun-300"
            >
              Save & Share
            </button>
          </div>

          <div className="hidden sm:block h-8 w-0.5 bg-border"></div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              value={loadCode}
              onChange={(e) => setLoadCode(e.target.value)}
              className="w-full sm:w-48 rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 font-mono text-sm font-bold text-ink-800 outline-none tracking-widest transition focus:ring-2 focus:ring-brand-500/40"
              placeholder="Enter Share Code"
            />
            <button
              onClick={() => void loadSnippetByCode()}
              className="shrink-0 rounded-xl border-2 border-ink-900 bg-surface-2 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop transition hover:bg-surface-1"
            >
              Load
            </button>
          </div>

          {snippetMessage && (
            <span className="text-sm font-bold text-mint-500 animate-pulse">{snippetMessage}</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snippets.map((snippet) => (
            <button
              key={snippet.id}
              onClick={() => {
                setLang(snippet.language in LANG_META ? (snippet.language as Lang) : "python");
                setCode(snippet.code);
                setSnippetName(snippet.name);
              }}
              className="rounded-xl border-2 border-border bg-surface-2 p-4 text-left hover:bg-surface-1 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-ink-800">{snippet.name}</div>
                <span className="rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-bold text-ink-500">
                  {snippet.language}
                </span>
              </div>
              <div className="mt-1 text-xs text-ink-500">
                {snippet.isShared ? "Shared" : "Private"} · {snippet.shareCode.slice(0, 8)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {runLimitReached && (
        <div className="rounded-2xl border-2 border-coral-300 bg-coral-50 shadow-card p-6 relative">
          <button
            onClick={() => setRunLimitReached(false)}
            className="absolute top-4 right-4 text-coral-500 hover:text-coral-700 font-bold"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🛑</span>
            <h2 className="text-lg font-bold text-coral-900">Playground Limit Reached</h2>
          </div>
          <p className="text-sm text-coral-800 mb-4">
            You have exhausted your Playground Runs on the Free plan. Upgrade to Pro or Elite for unlimited playground code executions!
          </p>
          <button
            onClick={() => navigate("/pricing")}
            className="rounded-xl border-2 border-coral-600 bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-pop-sm transition hover:bg-coral-600"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {plan === "free" && !runLimitReached && (
        <div className="rounded-xl bg-surface-0 border border-border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-600 font-medium">You are on the Free plan. Code executions are limited to 5 runs.</p>
          <button onClick={() => navigate("/pricing")} className="text-xs font-bold text-brand-600 hover:underline">
            Upgrade for unlimited
          </button>
        </div>
      )}

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
