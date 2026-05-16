import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";

type Problem = {
  id: string;
  index: string;
  name: string;
  problemUrl: string | null;
};

type Contest = {
  id: string;
  contestName: string;
  problems: Problem[];
};

type Message = {
  id: string;
  content: string;
  imageBase64: string | null;
  user: { username: string };
  createdAt: string;
};

export function ContestDetailPage() {
  const { id: squadId, contest_id: contestId } = useParams();
  const { getToken } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const api = createApiClient(getToken);
        const res = await api.get(`/squads/${squadId}/contests/${contestId}`);
        setContest(res.data.contest);
        if (res.data.contest.problems.length > 0) {
          setActiveProblem(res.data.contest.problems[0]);
        }
      } catch (err) {
        console.error("Failed to load contest", err);
      }
    }
    void load();
  }, [squadId, contestId, getToken]);

  if (!contest) return <div className="p-8 text-center text-slate-400">Loading contest...</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:flex-row gap-6">
      {/* Sidebar: Problems */}
      <div className="w-full md:w-64 flex flex-col gap-2 border-r border-slate-800 pr-6">
        <h1 className="text-xl font-bold mb-4 truncate" title={contest.contestName}>
          {contest.contestName}
        </h1>
        {contest.problems.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveProblem(p)}
            className={`text-left px-4 py-3 rounded-lg border transition ${
              activeProblem?.id === p.id
                ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                : "border-slate-800 bg-slate-900/50 hover:bg-slate-800"
            }`}
          >
            <div className="font-semibold">{p.index}</div>
            <div className="text-sm opacity-80 truncate">{p.name}</div>
          </button>
        ))}
      </div>

      {/* Main Area: Discussion */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 rounded-xl border border-slate-800">
        {activeProblem ? (
          <ProblemDiscussion problem={activeProblem} squadId={squadId!} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Select a problem to view discussions
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemDiscussion({ problem, squadId }: { problem: Problem; squadId: string }) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadMessages() {
      try {
        const api = createApiClient(getToken);
        const res = await api.get(`/squads/${squadId}/problems/${problem.id}/messages`);
        setMessages(res.data.messages);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    }
    void loadMessages();
    
    // Quick polling for messages (could be replaced by WebSocket)
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [problem.id, squadId, getToken]);

  const handleSend = async () => {
    if (!input.trim() && !imageFile) return;

    let imageBase64 = undefined;
    if (imageFile) {
      const reader = new FileReader();
      imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    try {
      const api = createApiClient(getToken);
      const res = await api.post(`/squads/${squadId}/problems/${problem.id}/messages`, {
        content: input,
        imageBase64
      });
      setMessages((prev) => [...prev, res.data.message]);
      setInput("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const renderContent = (content: string) => {
    // Simple basic markdown-like formatting for ```code```
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("\`\`\`") && part.endsWith("\`\`\`")) {
        const code = part.slice(3, -3).replace(/^\w+\n/, ""); // strip language tag optionally
        return (
          <div key={i} className="relative group my-2">
            <button
              onClick={() => handleCopyCode(code)}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 opacity-0 group-hover:opacity-100 transition"
            >
              Copy
            </button>
            <pre className="p-4 bg-slate-950 rounded-lg overflow-x-auto text-sm text-green-400 font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div>
          <h2 className="text-lg font-semibold">{problem.index}. {problem.name}</h2>
          {problem.problemUrl && (
            <a href={problem.problemUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
              Open on Platform ↗
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-slate-800/40 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-blue-300">{m.user.username}</span>
              <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="text-slate-200 whitespace-pre-wrap">{renderContent(m.content)}</div>
            {m.imageBase64 && (
              <img src={m.imageBase64} alt="Uploaded" className="mt-3 max-w-full rounded-lg max-h-64 object-contain" />
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        {imageFile && (
          <div className="mb-2 text-sm text-slate-400 flex items-center gap-2">
            <span>Attached: {imageFile.name}</span>
            <button onClick={() => setImageFile(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm"
          >
            📎 Image
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Discuss or paste code with ```..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 resize-none h-10 min-h-[40px] focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
