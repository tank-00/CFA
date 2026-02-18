"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Stage, Curriculum } from "@/lib/types";
import {
  getStageProgress,
  setStageCompleted,
  setStageInProgress,
  saveNote,
  toggleFlag,
  addTimeSpent,
  setLastVisited,
} from "@/lib/storage";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  StickyNote,
  BookmarkCheck,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import NoteDrawer from "./NoteDrawer";
import StageCompleteModal from "./StageCompleteModal";

interface Props {
  stage: Stage;
  curriculum: Curriculum | null;
}

export default function StageReader({ stage, curriculum }: Props) {
  const router = useRouter();

  // Progress state
  const [progress, setProgress] = useState(() => getStageProgress(stage.id));
  const [noteOpen, setNoteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  // Timer
  const startTimeRef = useRef(Date.now());
  const accumulatedRef = useRef(0);

  // Read progress %  for this reading (how far through the reading are we)
  const readingProgress = curriculum
    ? (() => {
        for (const topic of curriculum.topics) {
          const reading = topic.readings.find((r) => r.id === stage.readingId);
          if (reading) {
            const idx = reading.stages.indexOf(stage.id);
            return Math.round(((idx + 1) / reading.stages.length) * 100);
          }
        }
        return 0;
      })()
    : Math.round((stage.stageNumber / stage.totalStages) * 100);

  // Mark stage as in-progress on mount
  useEffect(() => {
    setStageInProgress(stage.id);
    setLastVisited(stage.id);
    setProgress(getStageProgress(stage.id));
    startTimeRef.current = Date.now();
    accumulatedRef.current = 0;

    // Save time on unmount
    return () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 5) {
        addTimeSpent(stage.id, elapsed + accumulatedRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id]);

  // Pause/resume timer when tab hides
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        accumulatedRef.current += elapsed;
        startTimeRef.current = Date.now();
      } else {
        startTimeRef.current = Date.now();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleMarkComplete = useCallback(() => {
    // Save time so far
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    addTimeSpent(stage.id, elapsed + accumulatedRef.current);
    accumulatedRef.current = 0;
    startTimeRef.current = Date.now();

    setStageCompleted(stage.id);
    setProgress(getStageProgress(stage.id));
    setCompleteOpen(true);
  }, [stage.id]);

  const handleSaveNote = useCallback(
    (note: string) => {
      saveNote(stage.id, note);
      setProgress(getStageProgress(stage.id));
    },
    [stage.id]
  );

  const handleToggleFlag = useCallback(() => {
    toggleFlag(stage.id);
    setProgress(getStageProgress(stage.id));
  }, [stage.id]);

  const isCompleted = progress.status === "completed";
  const isFlagged = progress.flagged;
  const hasNote = !!progress.note;

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Back */}
            <Link
              href={`/reading/${stage.readingId}`}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>

            {/* Breadcrumb + progress */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                {stage.topicTitle}
              </p>
              <p className="truncate text-sm font-medium">{stage.readingTitle}</p>
              <Progress value={readingProgress} className="mt-1.5 h-1" />
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={isFlagged ? "text-orange-500" : "text-muted-foreground"}
                onClick={handleToggleFlag}
                title={isFlagged ? "Remove flag" : "Flag for review"}
              >
                {isFlagged ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={hasNote ? "text-amber-500" : "text-muted-foreground"}
                onClick={() => setNoteOpen(true)}
                title="Notes"
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* ── Stage metadata ─────────────────────────────────── */}
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-snug">{stage.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Stage {stage.stageNumber} of {stage.totalStages}
                </span>
                <span>·</span>
                <span>~{stage.estimatedMinutes} min</span>
                {isCompleted && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Learning outcomes */}
          {stage.learningOutcomes.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                Learning Outcomes ({stage.learningOutcomes.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-4 text-muted-foreground">
                {stage.learningOutcomes.map((lo, i) => (
                  <li key={i} className="list-disc">
                    {lo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Key terms */}
          {stage.keyTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {stage.keyTerms.map((term) => (
                <Badge key={term} variant="secondary" className="text-xs">
                  {term}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── Note banner if note exists ─────────────────────── */}
        {hasNote && (
          <button
            onClick={() => setNoteOpen(true)}
            className="mx-4 mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-left text-xs dark:bg-amber-900/20"
          >
            <span className="font-medium text-amber-800 dark:text-amber-200">
              📝 Your note:
            </span>{" "}
            <span className="text-amber-700 dark:text-amber-300 line-clamp-2">
              {progress.note}
            </span>
          </button>
        )}

        {/* ── Main content ───────────────────────────────────── */}
        <main className="flex-1 px-4 py-5">
          <div
            className="reader-content"
            dangerouslySetInnerHTML={{ __html: stage.content }}
          />
        </main>

        {/* ── Bottom navigation ──────────────────────────────── */}
        <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Prev */}
            <Button
              variant="outline"
              size="sm"
              disabled={!stage.prevStageId}
              onClick={() =>
                stage.prevStageId && router.push(`/read/${stage.prevStageId}`)
              }
              className="flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Mark complete / already done */}
            <div className="flex-1">
              {isCompleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-emerald-600 border-emerald-300"
                  onClick={() => setCompleteOpen(true)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Completed — Next?
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleMarkComplete}
                >
                  Mark Complete ✓
                </Button>
              )}
            </div>

            {/* Next */}
            <Button
              variant="outline"
              size="sm"
              disabled={!stage.nextStageId}
              onClick={() =>
                stage.nextStageId && router.push(`/read/${stage.nextStageId}`)
              }
              className="flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>

      {/* Note drawer */}
      <NoteDrawer
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        stageId={stage.id}
        initialNote={progress.note}
        onSave={handleSaveNote}
      />

      {/* Completion modal */}
      <StageCompleteModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onOpenNotes={() => setNoteOpen(true)}
        nextStageId={stage.nextStageId}
        readingId={stage.readingId}
        timeSpent={progress.timeSpent}
        hasNote={hasNote}
      />
    </>
  );
}
