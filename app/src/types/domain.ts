// src/types/domain.ts

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'BREAK';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export type SubjectCategory =
  | 'MATHEMATICS'
  | 'SCIENCE'
  | 'HUMANITIES'
  | 'LANGUAGES'
  | 'PROGRAMMING'
  | 'LITERATURE'
  | 'OTHER';

export interface StudySession {
  id: string;
  userId: string;
  subject: string;
  category: SubjectCategory;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  status: TimerStatus;
  syncStatus: SyncStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  currentStreak: number;
  longestStreak: number;
  totalStudyTimeSeconds: number;
  lastStudyDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy?: string;
  createdAt: string;
  userRole?: 'ADMIN' | 'MEMBER';
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  isCreator: boolean;
  joinedAt: string;
}

export type LeaderboardTimeframe = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export interface LeaderboardEntry {
  id?: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalStudyTimeSeconds: number;
  rank?: number;
  timeframe?: LeaderboardTimeframe;
  updatedAt?: string;
}