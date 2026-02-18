// ─── Curriculum types ────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  stageNumber: number;
  totalStages: number;
  readingId: string;
  topicId: string;
  title: string;
  readingTitle: string;
  topicTitle: string;
  wordCount: number;
  estimatedMinutes: number;
  content: string;
  learningOutcomes: string[];
  keyTerms: string[];
  prevStageId: string | null;
  nextStageId: string | null;
}

export interface ReadingMeta {
  id: string;
  title: string;
  stageCount: number;
  stages: string[];
}

export interface TopicMeta {
  id: string;
  title: string;
  color: string;
  readings: ReadingMeta[];
}

export interface Curriculum {
  topics: TopicMeta[];
}

// ─── Progress types ───────────────────────────────────────────────────────────

export type StageStatus = "unread" | "in-progress" | "completed" | "flagged";

export interface StageProgress {
  status: StageStatus;
  completedAt: string | null;
  timeSpent: number; // seconds
  note: string;
  flagged: boolean;
}

export interface ProgressStore {
  stages: Record<string, StageProgress>;
  lastVisited: string | null;
  totalTimeSpent: number;
}

// ─── Derived / computed ───────────────────────────────────────────────────────

export interface TopicStats {
  topicId: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface OverallStats {
  completed: number;
  total: number;
  percentage: number;
  estimatedHoursRemaining: number;
}
