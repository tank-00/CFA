"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TopicMeta, ReadingMeta, Curriculum, ProgressStore } from "@/lib/types";
import { getAllProgress } from "@/lib/storage";
import { getReadingStats } from "@/lib/progress";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Circle, BookmarkCheck, Clock } from "lucide-react";

interface Props {
  topic: TopicMeta;
  reading: ReadingMeta;
  curriculum: Curriculum;
}

export default function ReadingClient({ topic, reading }: Props) {
  const [store, setStore] = useState<ProgressStore>({
    stages: {},
    lastVisited: null,
    totalTimeSpent: 0,
  });

  useEffect(() => {
    setStore(getAllProgress());
  }, []);

  const stats = getReadingStats(reading.stages, store);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      {/* Breadcrumb */}
      <Link
        href={`/topic/${topic.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {topic.title}
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <div
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: topic.color }}
        >
          Reading
        </div>
        <h1 className="text-xl font-bold leading-tight">{reading.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.completed} / {stats.total} stages · {stats.percentage}% complete
        </p>
        <Progress value={stats.percentage} className="mt-2 h-2" />
      </div>

      {/* Stage list */}
      {reading.stages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No stages yet. Process your PDFs to populate this reading.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reading.stages.map((stageId, idx) => {
            const progress = store.stages[stageId];
            const completed = progress?.status === "completed";
            const flagged = progress?.flagged;
            const hasNote = !!progress?.note;
            const timeSpent = progress?.timeSpent ?? 0;

            return (
              <Link href={`/read/${stageId}`} key={stageId}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 active:scale-[0.99]">
                  <div className="flex-shrink-0">
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Stage {idx + 1}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {timeSpent > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(timeSpent / 60)}m spent
                        </span>
                      )}
                      {hasNote && (
                        <span className="text-amber-500">📝 Note</span>
                      )}
                      {flagged && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <BookmarkCheck className="h-3 w-3" />
                          Review
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 text-xs font-medium"
                    style={{ color: completed ? "#10b981" : undefined }}
                  >
                    {completed ? "Done" : "→"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
