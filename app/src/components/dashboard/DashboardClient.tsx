"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Curriculum, ProgressStore, TopicMeta } from "@/lib/types";
import { getAllProgress, getLastVisited } from "@/lib/storage";
import { getOverallStats, getTopicStats } from "@/lib/progress";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import ProgressRing from "@/components/shared/ProgressRing";

interface Props {
  curriculum: Curriculum | null;
}

function TopicCard({
  topic,
  store,
  curriculum,
}: {
  topic: TopicMeta;
  store: ProgressStore;
  curriculum: Curriculum;
}) {
  const stats = getTopicStats(topic.id, curriculum, store);
  const totalReadings = topic.readings.length;

  let statusIcon = "○";
  if (stats.percentage === 100) statusIcon = "✓";
  else if (stats.percentage > 0) statusIcon = "◑";

  return (
    <Link href={`/topic/${topic.id}`} className="block">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]">
        <div className="flex-shrink-0">
          <ProgressRing
            percentage={stats.percentage}
            size={52}
            strokeWidth={5}
            color={topic.color}
          />
          <span
            className="sr-only"
            aria-label={`${stats.percentage}% complete`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {topic.title}
            </h3>
            <span
              className="flex-shrink-0 text-xs font-mono"
              style={{ color: topic.color }}
            >
              {stats.percentage}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {stats.completed} / {stats.total} stages · {totalReadings} reading
            {totalReadings !== 1 ? "s" : ""}
          </p>
          <Progress
            value={stats.percentage}
            className="mt-2 h-1.5"
            style={
              {
                "--progress-color": topic.color,
              } as React.CSSProperties
            }
          />
        </div>
        <div className="flex-shrink-0 text-lg text-muted-foreground">
          {statusIcon}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardClient({ curriculum }: Props) {
  const [store, setStore] = useState<ProgressStore>({
    stages: {},
    lastVisited: null,
    totalTimeSpent: 0,
  });
  const [lastVisited, setLastVisited] = useState<string | null>(null);

  useEffect(() => {
    setStore(getAllProgress());
    setLastVisited(getLastVisited());
  }, []);

  if (!curriculum) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">CFA Level 3</h1>
          <p className="mt-2 text-muted-foreground">
            No curriculum loaded. Run the PDF processing script first.
          </p>
          <pre className="mt-4 rounded bg-muted p-3 text-left text-sm">
            npx tsx scripts/process-pdfs.ts
          </pre>
        </div>
      </div>
    );
  }

  const overall = getOverallStats(curriculum, store);

  // Find the first incomplete stage across all topics
  let continueStageId: string | null = lastVisited;
  let continueStageTitle = "";
  let continueTopicTitle = "";
  let continueReadingTitle = "";

  if (!continueStageId) {
    // Find first incomplete stage
    for (const topic of curriculum.topics) {
      for (const reading of topic.readings) {
        const incompleteStage = reading.stages.find(
          (id) => store.stages[id]?.status !== "completed"
        );
        if (incompleteStage) {
          continueStageId = incompleteStage;
          break;
        }
      }
      if (continueStageId) break;
    }
  }

  // Look up metadata for the continue stage
  if (continueStageId) {
    for (const topic of curriculum.topics) {
      for (const reading of topic.readings) {
        if (reading.stages.includes(continueStageId)) {
          continueTopicTitle = topic.title;
          continueReadingTitle = reading.title;
          const idx = reading.stages.indexOf(continueStageId);
          continueStageTitle = `Stage ${idx + 1} of ${reading.stages.length}`;
        }
      }
    }
  }

  const hasPDFs = curriculum.topics.some((t) =>
    t.readings.some((r) => r.stageCount > 0)
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CFA Level 3</h1>
          <p className="text-sm text-muted-foreground">Study Platform</p>
        </div>
        <Link href="/notes" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          All Notes
        </Link>
      </div>

      {/* Overall progress */}
      <div className="mb-6 flex items-center gap-6 rounded-2xl border border-border bg-card p-5">
        <ProgressRing
          percentage={overall.percentage}
          size={80}
          strokeWidth={7}
          color="#3b82f6"
        />
        <div className="flex-1">
          <p className="text-3xl font-bold">{overall.percentage}%</p>
          <p className="text-sm text-muted-foreground">
            {overall.completed} of {overall.total} stages complete
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ~{overall.estimatedHoursRemaining}h remaining
          </p>
        </div>
      </div>

      {/* Continue button */}
      {hasPDFs && continueStageId && (
        <div className="mb-8">
          <Link href={`/read/${continueStageId}`} className="block">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground transition-all hover:opacity-95 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                    Continue Reading
                  </p>
                  <p className="mt-1 truncate text-base font-semibold">
                    {continueReadingTitle || "Loading…"}
                  </p>
                  <p className="mt-0.5 text-sm opacity-80">
                    {continueTopicTitle} · {continueStageTitle}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-3xl">▶</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* PDF upload prompt when no content */}
      {!hasPDFs && (
        <div className="mb-8 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-medium">No content loaded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your PDF files to the <code className="rounded bg-muted px-1">/pdfs</code> folder
            and run the processing script.
          </p>
          <pre className="mt-3 rounded bg-muted p-3 text-left text-xs">
            npx tsx scripts/process-pdfs.ts
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            The curriculum structure is ready — once your PDFs are processed, all stages will appear here.
          </p>
        </div>
      )}

      {/* Topics */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Topics
        </h2>
        <div className="flex flex-col gap-2">
          {curriculum.topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              store={store}
              curriculum={curriculum}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
