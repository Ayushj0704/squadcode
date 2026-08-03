import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useNotificationStore } from "../store/notificationStore";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Pin, MessageSquare, Copy, Check, Send, Smile, ArrowLeft, ExternalLink, Code2, Info, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from "../components/ui/Notifications";

type Thread = {
  id: string;
  squadId: string;
  title: string;
  platform: "codeforces" | "leetcode";
  contestName: string;
  pinned: boolean;
  linkedProblem?: {
    id: string;
    problemName: string;
    difficulty: string;
    problemUrl: string;
    tags: string[];
  } | null;
  createdAt: string;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  // `nickname` is the author's squad-scoped display name; fall back to the global
  // coding handle (username) when they haven't set one inside this squad.
  user: { id: string; username: string; nickname?: string | null; profileImageUrl?: string | null };
  reactions: { id: string; userId: string; emoji: string }[];
};

const EMOJIS = ["👍", "🔥", "😂", "🤔", "💡", "🎉"];

export function ThreadDetailPage() {
  const { thread_id: id } = useParams<{ thread_id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const lastThreadEvent = useNotificationStore((s) => s.lastThreadEvent);

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCodeDetected, setIsCodeDetected] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [runningCode, setRunningCode] = useState<string | null>(null);
  const [codeOutput, setCodeOutput] = useState<{ id: string, output: string } | null>(null);
  

  
  usePageTitle(thread ? `${thread.title} | SquadCode` : "Thread Details");

  const fetchThread = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      try {
        const api = createApiClient(() => getToken());
        const { data } = await api.get(`/threads/${id}/posts`);
        setThread(data.thread);
        setPosts(data.posts || []);
        setCurrentUserId(data.currentUserId ?? null);
      } catch (err) {
        if (opts?.silent) return;
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || "Failed to load thread");
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [id, getToken]
  );

  useEffect(() => {
    void fetchThread();
  }, [fetchThread]);

  // Live-refresh when a new post lands in any of the user's squads (the SSE hook
  // in AppShell bumps lastThreadEvent). Silent so it never flashes the loader or
  // clobbers the view with an error toast on a transient failure.
  useEffect(() => {
    if (lastThreadEvent === 0) return;
    void fetchThread({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastThreadEvent]);

  // Smart detect code as user types
  useEffect(() => {
    const lines = newPost.split('\n').length;
    const codePatterns = /^(#include|import |def |class |public class|int main|function |const |var |let |fn )/m;
    const hasBraces = /\{\n[\s\S]*\}/.test(newPost);
    
    if (lines >= 3 && (codePatterns.test(newPost) || hasBraces) && !newPost.includes('```')) {
      setIsCodeDetected(true);
    } else {
      setIsCodeDetected(false);
    }
  }, [newPost]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !id) return;
    
    setIsSubmitting(true);
    try {
      const api = createApiClient(() => getToken());
      
      let finalContent = newPost;
      if (isCodeDetected && !newPost.includes('```') && !newPost.includes('![Image]')) {
        let detectedLang = 'javascript';
        if (newPost.match(/^(#include|int main|using namespace|std::)/m)) {
          detectedLang = 'cpp';
        } else if (newPost.match(/^(def |import |from .* import)/m)) {
          detectedLang = 'python';
        } else if (newPost.match(/^(public class |import java)/m)) {
          detectedLang = 'java';
        }
        
        finalContent = `\`\`\`${detectedLang}\n${newPost}\n\`\`\``;
      }
      
      const { data } = await api.post(`/threads/${id}/posts`, { content: finalContent });
      setPosts((prev) => [...prev, data.post]);
      setNewPost("");
      setIsCodeDetected(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to post message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleRunCode = async (codeStr: string, lang: string, blockId: string) => {
    const supportedLang = 
      (lang === 'python' || lang === 'py') ? 'python' : 
      (lang === 'cpp' || lang === 'c++') ? 'cpp' : 
      (lang === 'java') ? 'java' : null;
      
    if (!supportedLang) {
      showToast(`Language '${lang}' not supported. Use python, cpp, or java.`, 'warning');
      return;
    }

    setRunningCode(blockId);
    try {
      const api = createApiClient(() => getToken());
      const { data } = await api.post('/execute', { code: codeStr, language: supportedLang });
      
      const output = data.stdout || data.stderr || "Program finished without output.";
      setCodeOutput({ id: blockId, output });
    } catch (err) {
      setCodeOutput({ id: blockId, output: "Error executing code." });
    } finally {
      setRunningCode(null);
    }
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    if (!currentUserId || !id) return;
    const api = createApiClient(() => getToken());

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasReacted = (p.reactions || []).find(r => r.userId === currentUserId && r.emoji === emoji);
      let newReactions = [...(p.reactions || [])];

      if (hasReacted) {
        newReactions = newReactions.filter(r => !(r.userId === currentUserId && r.emoji === emoji));
      } else {
        newReactions.push({ id: Math.random().toString(), userId: currentUserId, emoji });
      }
      return { ...p, reactions: newReactions };
    }));

    try {
      const post = posts.find(p => p.id === postId);
      const hasReacted = (post?.reactions || []).find(r => r.userId === currentUserId && r.emoji === emoji);
      
      if (hasReacted) {
        await api.delete(`/threads/${id}/posts/${postId}/reactions/${encodeURIComponent(emoji)}`);
      } else {
        await api.post(`/threads/${id}/posts/${postId}/reactions`, { emoji });
      }
    } catch (err) {
      console.error("Failed to toggle reaction", err);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-4 text-red-500">
          <Info size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-ink-900 ">Error Loading Thread</h2>
        <p className="text-ink-600 ">{error || "Thread not found"}</p>
        <button 
          onClick={() => navigate('/threads')}
          className="mt-6 rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 font-bold shadow-pop-sm transition hover:bg-ink-100"
        >
          Back to Squad
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:max-w-5xl lg:mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <button 
          onClick={() => navigate('/threads')}
          className="flex w-fit items-center gap-2 text-sm font-bold text-ink-600 transition hover:text-ink-900  :text-ink-100"
        >
          <ArrowLeft size={16} />
          Back to Discussions
        </button>
        
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {thread.pinned && (
                <span className="flex items-center gap-1 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800  ">
                  <Pin size={12} className="fill-current" /> Pinned
                </span>
              )}
              <span className="rounded-lg bg-ink-100 px-2 py-1 text-xs font-bold text-ink-600  ">
                {thread.platform === 'leetcode' ? 'LeetCode' : 'Codeforces'}
              </span>
              <span className="text-sm font-medium text-ink-500">
                {new Date(thread.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-black text-ink-900  md:text-3xl">
              {thread.title}
            </h1>
            {thread.contestName && (
              <p className="mt-1 text-sm font-medium text-ink-600 ">
                Contest: {thread.contestName}
              </p>
            )}
          </div>
        </div>

        {/* Linked Problem Card */}
        {thread.linkedProblem && (
          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-border bg-surface-0 p-4 shadow-sm ">
            <div>
              <div className="flex items-center gap-3">
                <a 
                  href={thread.linkedProblem.problemUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-bold text-brand-600 hover:underline "
                >
                  {thread.linkedProblem.problemName}
                  <ExternalLink size={16} />
                </a>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                  thread.linkedProblem.difficulty.toLowerCase() === 'easy' ? 'bg-green-100 text-green-700  ' :
                  thread.linkedProblem.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700  ' :
                  'bg-red-100 text-red-700  '
                }`}>
                  {thread.linkedProblem.difficulty}
                </span>
              </div>
              {thread.linkedProblem.tags && thread.linkedProblem.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {thread.linkedProblem.tags.map(tag => (
                    <span key={tag} className="rounded-lg bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600  ">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center text-ink-500">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="font-bold">No posts yet</p>
            <p className="text-sm">Be the first to share your thoughts!</p>
          </div>
        ) : (
          posts.map(post => {
            // Group reactions
            const reactionCounts = (post.reactions || []).reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            const userReactions = (post.reactions || [])
              .filter(r => r.userId === currentUserId)
              .map(r => r.emoji);

            return (
              <div key={post.id} className="flex gap-4">
                {/* Avatar */}
                {post.user.profileImageUrl ? (
                  <img src={post.user.profileImageUrl} alt={post.user.nickname ?? post.user.username} className="flex h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700  ">
                    {(post.user.nickname ?? post.user.username).charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-ink-900 ">{post.user.nickname ?? post.user.username}</span>
                    <span className="text-xs font-medium text-ink-500">
                      {new Date(post.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="mt-1 prose prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent text-ink-800 prose-p:text-ink-800 prose-headings:text-ink-900 prose-strong:text-ink-900 prose-a:text-brand-600 prose-code:text-coral-500 font-medium leading-relaxed">
                    <ReactMarkdown
                      components={{
                        code(props) {
                          const {children, className, node, ...rest} = props;
                          const match = /language-(\w+)/.exec(className || '');
                          const codeStr = String(children).replace(/\n$/, '');
                          const lang = match ? match[1] : '';
                          const isRunnable = ['python', 'cpp', 'c++', 'java', 'javascript', 'js'].includes(lang);
                          
                          // We use codeStr as blockId here since we don't have unique block IDs 
                          const blockId = post.id + '-' + codeStr.substring(0, 10);
                          
                          if (match) {
                            return (
                              <div className="group relative overflow-hidden rounded-xl border border-border bg-[#1e1e1e] my-4">
                                <div className="flex items-center justify-between border-b border-border/10 bg-black/20 px-4 py-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-ink-300 uppercase">
                                    <Code2 size={14} />
                                    {lang}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isRunnable && (
                                      <button
                                        onClick={() => handleRunCode(codeStr, lang, blockId)}
                                        disabled={runningCode === blockId}
                                        className="flex items-center gap-1 rounded bg-brand-500/20 border border-brand-500/30 px-2 py-1 text-xs font-bold text-brand-400 transition hover:bg-brand-500/40 disabled:opacity-50"
                                      >
                                        <Play size={12} className={runningCode === blockId ? "animate-pulse" : ""} />
                                        {runningCode === blockId ? 'Running...' : 'Run Code'}
                                        <span className="ml-1 rounded bg-brand-500 px-1 py-0.5 text-[9px] uppercase leading-none text-white shadow-sm">Pro</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleCopy(codeStr)}
                                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-ink-400 transition hover:bg-white/10 hover:text-white"
                                    >
                                      {copiedCode === codeStr ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="overflow-x-auto text-sm">
                                  <SyntaxHighlighter
                                    language={lang === 'c++' || lang === 'cpp' ? 'cpp' : lang}
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                  >
                                    {codeStr}
                                  </SyntaxHighlighter>
                                </div>
                                {codeOutput?.id === blockId && (
                                  <div className="border-t border-border/10 bg-black/40 p-3 font-mono text-xs text-ink-300 whitespace-pre-wrap">
                                    <div className="font-bold text-ink-500 mb-1 uppercase tracking-wider text-[10px]">Output Console:</div>
                                    {codeOutput.output}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <code className="bg-ink-100  rounded px-1.5 py-0.5 font-bold" {...rest}>{children}</code>;
                        },
                        img(props) {
                          return <img className="rounded-xl border-2 border-border max-h-96 object-cover shadow-sm my-2" {...props} />;
                        }
                      }}
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Reactions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {Object.entries(reactionCounts).map(([emoji, count]) => {
                      const isReacted = userReactions.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(post.id, emoji)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition ${
                            isReacted 
                              ? 'border-brand-500 bg-brand-50 text-brand-700  ' 
                              : 'border-border bg-surface-0 text-ink-600 hover:bg-ink-50   :bg-ink-800'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="font-bold">{count}</span>
                        </button>
                      );
                    })}
                    
                    <div className="group relative">
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-0 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900  :bg-ink-800">
                        <Smile size={14} />
                      </button>
                      <div className="absolute bottom-full left-0 mb-2 hidden items-center gap-1 rounded-xl border-2 border-border bg-surface-0 p-2 shadow-pop group-hover:flex z-10 ">
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(post.id, emoji)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-ink-100 :bg-ink-800"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose Box */}
      <div className="mt-auto pt-4 relative">
        {isCodeDetected && (
          <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 rounded-xl bg-brand-50 p-2 px-3 text-sm font-bold text-brand-700 shadow-sm  ">
            <Code2 size={16} />
            Code detected. It will be automatically formatted into a snippet.
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative rounded-2xl border-2 border-border bg-surface-0 p-2 shadow-sm focus-within:border-brand-500  transition-colors">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Write a message, paste code, or drop an image link..."
            className="w-full resize-none bg-transparent p-2 text-ink-900 placeholder:text-ink-400 focus:outline-none "
            rows={Math.min(10, Math.max(2, newPost.split('\n').length))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
              }
            }}
          />
          <div className="flex items-center justify-between border-t border-border px-2 pt-2 mt-1">
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-xs font-medium text-ink-500">
                <kbd className="rounded border border-border bg-ink-50 px-1 py-0.5 font-sans ">Ctrl</kbd> + <kbd className="rounded border border-border bg-ink-50 px-1 py-0.5 font-sans ">Enter</kbd> to send
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !newPost.trim()}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-brand-500 px-5 py-1.5 text-sm font-black text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-pop"
            >
              <Send size={16} />
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
