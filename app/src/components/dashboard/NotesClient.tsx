"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Curriculum, ProgressStore } from "@/lib/types";
import { getAllProgress } from "@/lib/storage";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  curriculum: Curriculum | null;
}

interface NoteEntry {
  stageId: string;
  stageTitle: string;
  readingTitle: string;
  topicTitle: string;
  topicColor: string;
  note: string;
  completedAt: string | null;
}

export default function NotesClient({ curriculum }: Props) {
  const [store, setStore] = useState<ProgressStore>({
    stages: {},
    lastVisited: null,
    totalTimeSpent: 0,
  });

  useEffect(() => {
    setStore(getAllProgress());
  }, []);

  if (!curriculum) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">No curriculum loaded.</p>
      </div>
    );
  }

  // Collect all notes
  const notes: NoteEntry[] = [];
  for (const topic of curriculum.topics) {
    for (const reading of topic.readings) {
      for (const stageId of reading.stages) {
        const progress = store.stages[stageId];
        if (progress?.note) {
          const idx = reading.stages.indexOf(stageId);
          notes.push({
            stageId,
            stageTitle: `Stage ${idx + 1} of ${reading.stages.length}`,
            readingTitle: reading.title,
            topicTitle: topic.title,
            topicColor: topic.color,
            note: progress.note,
            completedAt: progress.completedAt,
          });
        }
      }
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">All Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {notes.length} note{notes.length !== 1 ? "s" : ""} captured
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-3xl mb-3">📝</p>
          <p className="font-medium">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Notes you capture while reading will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((entry) => (
            <Link href={`/read/${entry.stageId}`} key={entry.stageId}>
              <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 active:scale-[0.99]">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge
                      className="mb-1 text-xs text-white"
                      style={{ backgroundColor: entry.topicColor }}
                    >
                      {entry.topicTitle}
                    </Badge>
                    <p className="truncate text-sm font-semibold">
                      {entry.readingTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.stageTitle}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    →
                  </span>
                </div>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 line-clamp-4">
                  {entry.note}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
