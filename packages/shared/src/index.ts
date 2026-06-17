/* ─── Shared Types ─── */

export type Platform = 'codeforces' | 'leetcode' | 'github';
export type ThreadPlatform = 'codeforces' | 'leetcode';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SquadMemberRole = 'admin' | 'member';
export type ActivityType = 'problem_solved' | 'rating_changed' | 'contest_participated';

/* ─── API Types ─── */

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface SquadSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  role: SquadMemberRole;
  joinedAt: string;
}

export interface SquadMember {
  id: string;
  role: SquadMemberRole;
  nickname?: string | null;
  joinedAt: string;
  user: { id: string; username: string };
}

export interface Squad {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  members: SquadMember[];
}

export interface ExecuteRequest {
  language: 'python' | 'cpp';
  code: string;
  stdin?: string;
}

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  code: number;
  memory: string | null;
  cpuTime: string | null;
}

export interface PlatformConnection {
  id: string;
  platform: Platform;
  username: string;
  verified: boolean;
  connectedAt: string;
}

/* ─── Constants ─── */

export const MAX_CODE_LENGTH = 50_000;
export const MAX_STDIN_LENGTH = 10_000;
export const MAX_SQUAD_NAME_LENGTH = 48;
export const MAX_NICKNAME_LENGTH = 32;
export const MAX_THREAD_TITLE_LENGTH = 120;
export const MAX_POST_CONTENT_LENGTH = 4_000;
export const MAX_SHEET_TITLE_LENGTH = 120;

export const SUPPORTED_LANGUAGES = ['python', 'cpp'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
