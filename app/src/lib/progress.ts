import type {
  Curriculum,
  ProgressStore,
  TopicStats,
  OverallStats,
} from "./types";

export function getTopicStats(
  topicId: string,
  curriculum: Curriculum,
  store: ProgressStore
): TopicStats {
  const topic = curriculum.topics.find((t) => t.id === topicId);
  if (!topic) return { topicId, completed: 0, total: 0, percentage: 0 };

  const allStageIds = topic.readings.flatMap((r) => r.stages);
  const total = allStageIds.length;
  const completed = allStageIds.filter(
    (id) => store.stages[id]?.status === "completed"
  ).length;

  return {
    topicId,
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getOverallStats(
  curriculum: Curriculum,
  store: ProgressStore,
  avgMinutesPerStage = 17
): OverallStats {
  const allStageIds = curriculum.topics
    .flatMap((t) => t.readings)
    .flatMap((r) => r.stages);

  const total = allStageIds.length;
  const completed = allStageIds.filter(
    (id) => store.stages[id]?.status === "completed"
  ).length;
  const remaining = total - completed;
  const estimatedHoursRemaining = Math.round(
    (remaining * avgMinutesPerStage) / 60
  );

  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    estimatedHoursRemaining,
  };
}

export function getReadingStats(
  stageIds: string[],
  store: ProgressStore
): { completed: number; total: number; percentage: number } {
  const total = stageIds.length;
  const completed = stageIds.filter(
    (id) => store.stages[id]?.status === "completed"
  ).length;
  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function getFirstIncompleteStage(
  curriculum: Curriculum,
  store: ProgressStore
): string | null {
  for (const topic of curriculum.topics) {
    for (const reading of topic.readings) {
      for (const stageId of reading.stages) {
        if (store.stages[stageId]?.status !== "completed") {
          return stageId;
        }
      }
    }
  }
  return null;
}
