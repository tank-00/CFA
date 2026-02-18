# CFA Level 3 Learning Platform — Design & Implementation Plan

## Overview

A focused, single-user reading platform for CFA Level 3. No auth, no DB, no bloat.
Goal: get through dense material in 15-20 min focused sessions with progress memory and frictionless note-taking.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, file-based routing, RSC |
| Styling | Tailwind CSS + shadcn/ui | Rapid mobile-first UI |
| State | localStorage + React Context | Single user, no server needed |
| PDF Parsing | `pdfjs-dist` (CLI script) | Extract text at build time |
| Hosting | Vercel | Zero config, CDN edges |
| Content | Static JSON files | Pre-generated, fast, offline-capable |

No Supabase. No auth. All progress lives in the browser's localStorage.

---

## CFA Level 3 Curriculum Structure (2024)

11 Topic Areas → ~38 Readings → ~2,500-3,000 pages

```
Topic 1:  Behavioral Finance                        (3 readings)
Topic 2:  Capital Market Expectations               (2 readings)
Topic 3:  Asset Allocation                          (5 readings)
Topic 4:  Fixed Income Portfolio Management         (5 readings)
Topic 5:  Equity Portfolio Management               (4 readings)
Topic 6:  Alternative Investments                   (2 readings)
Topic 7:  Risk Management                           (2 readings)
Topic 8:  Risk Management Applications (Derivatives)(4 readings)
Topic 9:  Trading, Performance & Manager Selection  (4 readings)
Topic 10: Cases in Portfolio Management             (3 readings)
Topic 11: Ethical and Professional Standards        (4 readings)
```

---

## Content Pipeline (PDF → JSON)

### Step 1: PDF Processing Script

A one-time Node.js script (`scripts/process-pdfs.ts`) that:

1. Reads all PDF files from `/pdfs/` folder
2. Extracts raw text using `pdfjs-dist`
3. Detects section boundaries via heading patterns (ALL CAPS headers, numbered sections, Learning Outcome Statement markers)
4. Splits content into **stages of ~1,800-2,200 words** (≈ 15-20 min at CFA reading pace of ~120 wpm with comprehension pauses)
5. Outputs structured JSON to `/public/content/`

### Step 2: Chunking Logic

**Primary split signals (in priority order):**
1. "Learning Outcome Statement" (LOS) boundaries — each LOS becomes its own stage
2. Major section headers (detected by font size metadata from PDF or ALL CAPS patterns)
3. Word count ceiling of 2,200 words (hard cap — split at paragraph boundary)

**Each stage JSON:**
```json
{
  "id": "t3-r2-s4",
  "topicId": "3",
  "readingId": "3-2",
  "stageNumber": 4,
  "title": "Mean-Variance Optimization",
  "readingTitle": "Principles of Asset Allocation",
  "topicTitle": "Asset Allocation",
  "wordCount": 1950,
  "estimatedMinutes": 16,
  "content": "...",
  "learningOutcomes": ["Explain the...", "Calculate..."],
  "keyTerms": ["efficient frontier", "Sharpe ratio"],
  "prevStageId": "t3-r2-s3",
  "nextStageId": "t3-r2-s5"
}
```

### Step 3: Curriculum Manifest

`/public/content/curriculum.json` — the full tree used for navigation and progress calculation:
```json
{
  "topics": [
    {
      "id": "3",
      "title": "Asset Allocation",
      "readings": [
        {
          "id": "3-2",
          "title": "Principles of Asset Allocation",
          "stageCount": 8,
          "stages": ["t3-r2-s1", ..., "t3-r2-s8"]
        }
      ]
    }
  ]
}
```

---

## Application Architecture

```
/
├── public/
│   └── content/
│       ├── curriculum.json
│       └── stages/
│           ├── t1-r1-s1.json
│           └── ...
├── scripts/
│   └── process-pdfs.ts        ← Run once per PDF batch
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout, progress provider
│   │   ├── page.tsx            ← Dashboard
│   │   ├── topic/[topicId]/
│   │   │   └── page.tsx        ← Topic overview
│   │   ├── reading/[readingId]/
│   │   │   └── page.tsx        ← Reading overview (all stages listed)
│   │   └── read/[stageId]/
│   │       └── page.tsx        ← Stage reader (core experience)
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── TopicCard.tsx
│   │   │   ├── OverallProgress.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── reader/
│   │   │   ├── StageContent.tsx
│   │   │   ├── ReaderHeader.tsx
│   │   │   ├── ReaderFooter.tsx
│   │   │   ├── NoteDrawer.tsx
│   │   │   └── StageComplete.tsx
│   │   └── shared/
│   │       ├── ProgressBar.tsx
│   │       └── BreadcrumbNav.tsx
│   ├── lib/
│   │   ├── storage.ts          ← All localStorage read/write
│   │   ├── progress.ts         ← Aggregation helpers
│   │   └── types.ts            ← Shared TypeScript types
│   └── context/
│       └── ProgressContext.tsx ← Global progress state
```

---

## Progress Data Model (localStorage)

**Key:** `cfa_progress`

```typescript
interface ProgressStore {
  stages: {
    [stageId: string]: {
      completed: boolean;
      completedAt: string | null;    // ISO timestamp
      timeSpent: number;             // seconds
      note: string;                  // free-form markdown
      flagged: boolean;              // "needs review"
    }
  };
  lastVisited: string;               // stageId
  totalTimeSpent: number;            // seconds, all-time
}
```

**Derived metrics (computed, never stored):**
- Topic completion % = completed stages / total stages in topic
- Overall completion % = total completed / total stages
- Estimated time remaining = remaining stages × avg estimatedMinutes

---

## Screen-by-Screen Design

### 1. Dashboard (`/`)

**Mobile layout (primary):**
```
┌─────────────────────────┐
│ CFA Level 3          ⚙️ │
│ ━━━━━━━━━━░░░░░░░░░░░░ │  ← overall progress bar
│ 127 / 420 stages  30%  │
│                         │
│ ▶ CONTINUE READING      │  ← large CTA, last visited stage
│   "Mean-Variance Opt."  │
│   Asset Allocation · 16m│
│                         │
│ ── TOPICS ──────────── │
│                         │
│ ✓ Behavioral Finance    │
│   ████████████ 100%     │
│                         │
│ ◑ Asset Allocation      │
│   ████░░░░░░░░  45%     │
│                         │
│ ○ Fixed Income PM       │
│   ░░░░░░░░░░░░   0%     │
│ ...                     │
└─────────────────────────┘
```

**Topic cards show:**
- Topic name + completion %
- Visual progress bar (color-coded: green complete, amber in-progress, gray untouched)
- Tap → Topic overview

### 2. Topic Overview (`/topic/[topicId]`)

```
┌─────────────────────────┐
│ ← Asset Allocation      │
│ 45% complete · 8h left  │
│                         │
│ Reading 1               │
│ Overview of Asset Alloc.│
│ ████████████ 100% · 4s  │  ← stages count
│                         │
│ Reading 2               │
│ Principles of Asset...  │
│ ████░░░░░░░░  50% · 8s  │
│ [Continue →]            │
│                         │
│ Reading 3               │
│ Asset Allocation with.. │
│ ░░░░░░░░░░░░   0% · 6s  │
│ [Start →]               │
└─────────────────────────┘
```

### 3. Stage Reader (`/read/[stageId]`) — Core Experience

**Mobile layout:**
```
┌─────────────────────────┐
│ ← Asset Allocation   📝 │  ← breadcrumb + notes button
│ Stage 4 of 8            │
│ ▓▓▓▓▓░░░░ 50%          │  ← reading-level progress
├─────────────────────────┤
│                         │
│ Mean-Variance           │
│ Optimization            │
│                         │
│ The efficient frontier  │
│ represents the set of   │
│ portfolios that offer   │
│ the highest expected    │
│ return for a given      │
│ level of risk...        │
│                         │
│ [content continues]     │
│                         │
│                         │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ ← Back    Mark Done ✓ → │
└─────────────────────────┘
```

**Key UX details:**
- Clean serif font (Georgia or similar) at 18px, line-height 1.8 — optimized for reading
- No distracting sidebars on mobile
- "Mark Done" bottom-right primary CTA
- 📝 note icon top-right — opens bottom drawer
- Timer runs silently in background (counts time on page, stored on exit)
- Scroll position remembered per stage

**Note Drawer (slides up from bottom):**
```
┌─────────────────────────┐
│ Notes — Stage 4         │  ← drag handle
│ ─────────────────────── │
│                         │
│ Key insight: EF assumes │
│ normal returns - fails  │
│ in tail events          │
│                         │
│ Remember: corner port.  │
│ = 100% single asset     │
│                         │
│ [text area, no limit]   │
│                         │
│         [Save & Close]  │
└─────────────────────────┘
```

**Stage Completion Modal:**
Appears when "Mark Done" is tapped:
```
┌─────────────────────────┐
│         ✓               │
│   Stage Complete!       │
│   Time: 18 min          │
│                         │
│ 📝 Add a note before    │
│    moving on?           │
│                         │
│ [Add Note]  [Next →]    │
└─────────────────────────┘
```
- Always offers note-taking before proceeding
- Shows time spent on stage
- If note already exists, shows "Edit Note" instead

### 4. Desktop Layout

On wider screens, splits into two-panel:
- Left: content reader (max-width 680px, centered)
- Right: persistent note panel (300px)
- Notes auto-save, no modal needed

---

## Key UX Principles

1. **Zero friction to continue** — Dashboard has one giant "Continue" button resuming exactly where you left off
2. **Notes are always prompted but never forced** — completion modal nudges, never blocks
3. **Progress is granular but visible** — stage-level, reading-level, topic-level, overall
4. **Flagging** — stages can be marked "needs review" for later revision
5. **No clock pressure** — estimated times shown as guidance, not as timers
6. **Typography first** — reading experience matches a good e-reader, not a flashcard app
7. **Offline-capable** — all content is static JSON, works without network after first load

---

## Implementation Phases

### Phase 1: Scaffolding + PDF Pipeline
1. Initialize Next.js 14 project with Tailwind + shadcn/ui
2. Write `scripts/process-pdfs.ts` — the PDF-to-JSON converter
3. Run script on first batch of PDFs, validate JSON output
4. Generate `curriculum.json` manifest

### Phase 2: Core Reading Experience
5. Build `ProgressContext` + `storage.ts` (localStorage layer)
6. Build Stage Reader page with content rendering
7. Build NoteDrawer component
8. Build StageComplete modal with note prompt
9. Timer logic (silent, stored on navigate away)

### Phase 3: Navigation & Progress
10. Build Dashboard with overall progress + topic cards
11. Build Topic Overview page
12. Build Reading Overview page (stage list)
13. "Continue" button logic (last visited stage)

### Phase 4: Polish & Mobile
14. Mobile responsiveness audit
15. Scroll position memory per stage
16. Flagging ("needs review") feature
17. PWA manifest (optional — makes it installable on phone)

### Phase 5: Deploy
18. Vercel deployment configuration
19. Verify static JSON serving at edge

---

## PDF Processing — Practical Notes

When you provide PDF files:
- Place them in `/pdfs/` folder with naming like `topic-3-asset-allocation.pdf`
- Run: `npx tsx scripts/process-pdfs.ts`
- Review generated stage count and spot-check a few JSON files
- Adjust `WORDS_PER_STAGE` constant (default: 2000) to tune stage length

**Heading detection strategy:**
The script will look for:
- Lines matching "LEARNING OUTCOME STATEMENTS" or "LOS \d+"
- Lines in ALL CAPS under 80 chars (section headers)
- Lines with consistent PDF font-size metadata (larger = heading)

This handles the CFA curriculum's structure well since each LOS is a natural ~15-20 min study unit.

---

## Estimated Scale

| Metric | Estimate |
|---|---|
| Total pages | ~2,500 |
| Words/page (CFA dense text) | ~350 |
| Total words | ~875,000 |
| Words per stage | ~2,000 |
| Total stages | ~437 |
| Avg time per stage | 17 min |
| Total study hours | ~124 hours |
| JSON files generated | ~437 stage files + curriculum.json |
| Total static content size | ~15-20 MB (well within Vercel free tier) |
