"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TopicMeta, Curriculum, ProgressStore } from "@/lib/types";
import { getAllProgress } from "@/lib/storage";
import { getReadingStats, getTopicStats } from "@/lib/progress";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface Props {
  topic: TopicMeta;
  curriculum: Curriculum;
}

export default function TopicClient({ topic, curriculum }: Props) {
  const [store, setStore] = useState<ProgressStore>({
    stages: {},
    lastVisited: null,
    totalTimeSpent: 0,
  });

  useEffect(() => {
    setStore(getAllProgress());
  }, []);

  const topicStats = getTopicStats(topic.id, curriculum, store);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <div
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: topic.color }}
        >
          Topic
        </div>
        <h1 className="text-2xl font-bold leading-tight">{topic.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {topicStats.completed} / {topicStats.total} stages complete ·{" "}
          {topicStats.percentage}%
        </p>
        <Progress value={topicStats.percentage} className="mt-3 h-2" />
      </div>

      {/* Readings list */}
      <div className="flex flex-col gap-3">
        {topic.readings.map((reading, idx) => {
          const stats = getReadingStats(reading.stages, store);

          // Find first incomplete stage to link to
          const firstIncomplete = reading.stages.find(
            (id) => store.stages[id]?.status !== "completed"
          );
          const linkStage = firstIncomplete ?? reading.stages[0];
          const hasContent = reading.stageCount > 0;

          return (
            <div
              key={reading.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: topic.color }}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-snug">
                    {reading.title}
                  </h3>
                  {hasContent ? (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stats.completed} / {stats.total} stages ·{" "}
                        {stats.percentage}%
                      </p>
                      <Progress
                        value={stats.percentage}
                        className="mt-2 h-1.5"
                      />
                      <div className="mt-3">
                        {stats.percentage === 100 ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-emerald-600">
                              ✓ Complete
                            </span>
                            <Link href={`/reading/${reading.id}`}>
                              <Button variant="outline" size="sm">
                                Review
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Link href={linkStage ? `/read/${linkStage}` : `/reading/${reading.id}`}>
                            <Button size="sm" style={{ backgroundColor: topic.color }}>
                              {stats.percentage === 0 ? "Start" : "Continue"} →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground italic">
                      No content yet — add PDF and run processing script
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
