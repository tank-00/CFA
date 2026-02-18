"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ProgressStore, Curriculum } from "@/lib/types";
import {
  getAllProgress,
  setStageCompleted,
  setStageInProgress,
  saveNote,
  toggleFlag,
  addTimeSpent,
  setLastVisited,
  getLastVisited,
} from "@/lib/storage";

interface ProgressContextValue {
  store: ProgressStore;
  curriculum: Curriculum | null;
  lastVisited: string | null;
  markCompleted: (stageId: string) => void;
  markInProgress: (stageId: string) => void;
  updateNote: (stageId: string, note: string) => void;
  flipFlag: (stageId: string) => void;
  recordTime: (stageId: string, seconds: number) => void;
  visitStage: (stageId: string) => void;
  refresh: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({
  children,
  curriculum,
}: {
  children: React.ReactNode;
  curriculum: Curriculum | null;
}) {
  const [store, setStore] = useState<ProgressStore>({
    stages: {},
    lastVisited: null,
    totalTimeSpent: 0,
  });
  const [lastVisited, setLastVisitedState] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setStore(getAllProgress());
    setLastVisitedState(getLastVisited());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markCompleted = useCallback(
    (stageId: string) => {
      setStageCompleted(stageId);
      refresh();
    },
    [refresh]
  );

  const markInProgress = useCallback(
    (stageId: string) => {
      setStageInProgress(stageId);
      refresh();
    },
    [refresh]
  );

  const updateNote = useCallback(
    (stageId: string, note: string) => {
      saveNote(stageId, note);
      refresh();
    },
    [refresh]
  );

  const flipFlag = useCallback(
    (stageId: string) => {
      toggleFlag(stageId);
      refresh();
    },
    [refresh]
  );

  const recordTime = useCallback(
    (stageId: string, seconds: number) => {
      addTimeSpent(stageId, seconds);
      refresh();
    },
    [refresh]
  );

  const visitStage = useCallback(
    (stageId: string) => {
      setLastVisited(stageId);
      setLastVisitedState(stageId);
    },
    []
  );

  return (
    <ProgressContext.Provider
      value={{
        store,
        curriculum,
        lastVisited,
        markCompleted,
        markInProgress,
        updateNote,
        flipFlag,
        recordTime,
        visitStage,
        refresh,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
