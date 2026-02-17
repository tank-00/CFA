"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  stageId: string;
  initialNote: string;
  onSave: (note: string) => void;
}

export default function NoteDrawer({
  open,
  onClose,
  stageId,
  initialNote,
  onSave,
}: Props) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, stageId]);

  function handleSave() {
    onSave(note);
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">Notes</DrawerTitle>
          <p className="text-xs text-muted-foreground">
            Capture key insights, formulas, or concepts to remember.
          </p>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Key insight: …&#10;Remember: …&#10;Formula: …"
            className="min-h-[200px] resize-none text-sm leading-relaxed"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save &amp; Close
            </Button>
            {note && (
              <Button
                variant="outline"
                onClick={() => {
                  setNote("");
                  onSave("");
                  onClose();
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
