"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/progress";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenNotes: () => void;
  nextStageId: string | null;
  readingId: string;
  timeSpent: number;
  hasNote: boolean;
}

export default function StageCompleteModal({
  open,
  onClose,
  onOpenNotes,
  nextStageId,
  readingId,
  timeSpent,
  hasNote,
}: Props) {
  const router = useRouter();

  if (!open) return null;

  function handleNext() {
    if (nextStageId) {
      router.push(`/read/${nextStageId}`);
    } else {
      router.push(`/reading/${readingId}`);
    }
  }

  function handleNotes() {
    onClose();
    onOpenNotes();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/30">
            ✓
          </div>
          <h2 className="text-xl font-bold">Stage Complete!</h2>
          {timeSpent > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Time spent: {formatTime(timeSpent)}
            </p>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-900/20">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            📝 {hasNote ? "You have a note for this stage." : "Add a note before moving on?"}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            {hasNote
              ? "Good work! Review or update your note below."
              : "Capture the key concept, formula, or insight from this stage."}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleNotes} variant="outline" className="w-full">
            {hasNote ? "Edit Note" : "Add Note"}
          </Button>
          <Button onClick={handleNext} className="w-full">
            {nextStageId ? "Next Stage →" : "Finish Reading ✓"}
          </Button>
        </div>
      </div>
    </div>
  );
}
