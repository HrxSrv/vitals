// ─── User / Auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export type Relationship =
  | 'self'
  | 'mother'
  | 'father'
  | 'spouse'
  | 'grandmother'
  | 'grandfather'
  | 'other';

export type Gender = 'male' | 'female' | 'other';

export interface Profile {
  id: string;
  userId: string;
  name: string;
  relationship: Relationship;
  dob: string; // ISO date string
  gender: Gender;
  isDefault: boolean;
  createdAt: string;
}

export interface ProfileFormData {
  name: string;
  relationship: Relationship;
  dob: string;
  gender: Gender;
}

// ─── Report ──────────────────────────────────────────────────────────────────

export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Report {
  id: string;
  userId: string;
  profileId: string;
  fileUrl: string;
  reportDate: string;
  processingStatus: ProcessingStatus;
  uploadedAt: string;
  biomarkers?: BiomarkerWithStatus[];
}

// ─── Biomarker ───────────────────────────────────────────────────────────────

export type BiomarkerStatus = 'normal' | 'borderline' | 'high' | 'low';
export type BiomarkerTrend = 'improving' | 'worsening' | 'stable' | 'new';

export interface BiomarkerDefinition {
  displayName: string;
  category: string;
  refRangeLow: number;
  refRangeHigh: number;
  unit: string;
}

export interface Biomarker {
  id: string;
  name: string;
  nameNormalized: string;
  category: string;
  value: number;
  unit: string;
  reportDate: string;
  definition?: BiomarkerDefinition;
}

export interface BiomarkerWithStatus {
  biomarker: Biomarker;
  definition?: BiomarkerDefinition;
  status: BiomarkerStatus;
  trend?: BiomarkerTrend;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalReports: number;
  latestReportDate: string | null;
  daysSinceLastReport: number | null;
  biomarkerCount: number;
}

export interface LHM {
  markdown: string;
  version: number;
  tokensApprox: number;
  lastUpdatedAt: string;
}

export interface DashboardData {
  profile: Profile;
  summary: DashboardSummary;
  latestBiomarkers: BiomarkerWithStatus[];
  lhm?: LHM;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isPartial?: boolean;
}

export interface ChatSession {
  id: string;
  profileId: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  profileId: string;
  role: MessageRole;
  content: string;
  isPartial: boolean;
  createdAt: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
}
