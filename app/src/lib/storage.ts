"use client";

import type { ProgressStore, StageProgress } from "./types";

const STORAGE_KEY = "cfa_progress";

const defaultStageProgress = (): StageProgress => ({
  status: "unread",
  completedAt: null,
  timeSpent: 0,
  note: "",
  flagged: false,
});

function getStore(): ProgressStore {
  if (typeof window === "undefined") {
    return { stages: {}, lastVisited: null, totalTimeSpent: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stages: {}, lastVisited: null, totalTimeSpent: 0 };
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return { stages: {}, lastVisited: null, totalTimeSpent: 0 };
  }
}

function saveStore(store: ProgressStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getStageProgress(stageId: string): StageProgress {
  const store = getStore();
  return store.stages[stageId] ?? defaultStageProgress();
}

export function setStageCompleted(stageId: string): void {
  const store = getStore();
  const current = store.stages[stageId] ?? defaultStageProgress();
  store.stages[stageId] = {
    ...current,
    status: "completed",
    completedAt: current.completedAt ?? new Date().toISOString(),
  };
  saveStore(store);
}

export function setStageInProgress(stageId: string): void {
  const store = getStore();
  const current = store.stages[stageId] ?? defaultStageProgress();
  if (current.status === "unread") {
    store.stages[stageId] = { ...current, status: "in-progress" };
  }
  saveStore(store);
}

export function saveNote(stageId: string, note: string): void {
  const store = getStore();
  const current = store.stages[stageId] ?? defaultStageProgress();
  store.stages[stageId] = { ...current, note };
  saveStore(store);
}

export function toggleFlag(stageId: string): boolean {
  const store = getStore();
  const current = store.stages[stageId] ?? defaultStageProgress();
  const flagged = !current.flagged;
  store.stages[stageId] = { ...current, flagged };
  saveStore(store);
  return flagged;
}

export function addTimeSpent(stageId: string, seconds: number): void {
  const store = getStore();
  const current = store.stages[stageId] ?? defaultStageProgress();
  store.stages[stageId] = {
    ...current,
    timeSpent: current.timeSpent + seconds,
  };
  store.totalTimeSpent = (store.totalTimeSpent ?? 0) + seconds;
  saveStore(store);
}

export function setLastVisited(stageId: string): void {
  const store = getStore();
  store.lastVisited = stageId;
  saveStore(store);
}

export function getLastVisited(): string | null {
  return getStore().lastVisited;
}

export function getAllProgress(): ProgressStore {
  return getStore();
}

export function getCompletedStageIds(): Set<string> {
  const store = getStore();
  return new Set(
    Object.entries(store.stages)
      .filter(([, p]) => p.status === "completed")
      .map(([id]) => id)
  );
}
