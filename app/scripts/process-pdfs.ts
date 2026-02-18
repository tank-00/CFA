/**
 * CFA Level 3 PDF Processing Script — 2026 Edition
 *
 * Processes the 6 official CFA 2026 Level 3 volumes:
 *   cfa-program2026L3V1.pdf              (Behavioral Finance, CME, Asset Allocation)
 *   cfa-program2026L3V2.pdf              (Fixed Income Portfolio Management)
 *   cfa-program2026L3V3.pdf              (Equity Portfolio Management)
 *   cfa-program2026L3V4.pdf              (Private Wealth, Institutional PM)
 *   cfa-program2026L3V5.pdf              (Trading, Performance, Cases, Ethics)
 *   cfa-program2026L3Private-MarketsV1.pdf  (Alternative / Private Markets)
 *
 * Place all PDFs in the /pdfs folder (sibling to /app), then run:
 *   cd app && npx tsx scripts/process-pdfs.ts
 *
 * Output:
 *   public/content/stages/<stageId>.json  — one file per 15-20 min stage
 *   public/content/curriculum.json        — updated with stage IDs
 */

import { promises as fs } from "fs";
import path from "path";

// ─── Configuration ────────────────────────────────────────────────────────────

const WORDS_PER_STAGE = 2000;      // ~15-20 min at CFA reading pace
const AVG_READING_WPM = 120;       // words per minute for dense technical text
const PDF_DIR  = path.join(process.cwd(), "..", "pdfs");
const STAGES_DIR = path.join(process.cwd(), "public", "content", "stages");
const CURRICULUM_PATH = path.join(process.cwd(), "public", "content", "curriculum.json");

/**
 * Maps each PDF filename → ordered list of reading IDs it contains.
 * Reading IDs match those in curriculum.json.
 *
 * Volume assignments based on CFA 2026 Level 3 curriculum structure.
 * If the boundary detection misassigns a few stages, you can re-run after
 * adjusting VOLUME_MAP or the reading titles in curriculum.json.
 */
const VOLUME_MAP: Record<string, string[]> = {
  "cfa-program2026L3V1.pdf": [
    "1-1", "1-2",           // Behavioral Finance
    "2-1", "2-2",           // Capital Market Expectations
    "3-1", "3-2", "3-3",    // Asset Allocation
  ],
  "cfa-program2026L3V2.pdf": [
    "4-1", "4-2", "4-3", "4-4",   // Fixed Income Portfolio Management
  ],
  "cfa-program2026L3V3.pdf": [
    "5-1", "5-2", "5-3", "5-4",   // Equity Portfolio Management
  ],
  "cfa-program2026L3V4.pdf": [
    "7-1", "7-2", "7-3",   // Private Wealth Management
    "8-1",                  // Portfolio Management for Institutional Investors
  ],
  "cfa-program2026L3V5.pdf": [
    "9-1", "9-2", "9-3",              // Trading, Performance, Manager Selection
    "10-1",                            // Cases in Portfolio Management
    "11-1", "11-2", "11-3", "11-4",   // Ethics & Professional Standards
  ],
  "cfa-program2026L3Private-MarketsV1.pdf": [
    "6-1", "6-2",   // Alternative / Private Markets Investments
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageJSON {
  id: string;
  stageNumber: number;
  totalStages: number;
  readingId: string;
  topicId: string;
  title: string;
  readingTitle: string;
  topicTitle: string;
  wordCount: number;
  estimatedMinutes: number;
  content: string;
  learningOutcomes: string[];
  keyTerms: string[];
  prevStageId: string | null;
  nextStageId: string | null;
}

interface ReadingMeta {
  id: string;
  title: string;
  stageCount: number;
  stages: string[];
}

interface TopicMeta {
  id: string;
  title: string;
  color: string;
  readings: ReadingMeta[];
}

interface Curriculum {
  topics: TopicMeta[];
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

interface PageText {
  pageNum: number;
  text: string;
}

async function extractPagesFromPDF(pdfPath: string): Promise<PageText[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
  const data = await fs.readFile(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const pages: PageText[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = textContent.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    pages.push({ pageNum: i, text });
  }
  return pages;
}

// ─── Reading boundary detection ───────────────────────────────────────────────

/**
 * Given the full ordered list of pages for a volume and the reading titles
 * that should be in that volume, returns the starting page index for each reading.
 *
 * Strategy:
 * 1. For each reading title, extract "signal words" (meaningful words ≥ 5 chars).
 * 2. Slide a window over the pages looking for the highest density of signal words.
 * 3. The page with the highest score (beyond a minimum threshold) is the boundary.
 * 4. If no boundary is found for a reading, fall back to even division.
 */
function detectReadingBoundaries(
  pages: PageText[],
  readingTitles: string[]
): number[] {
  if (readingTitles.length <= 1) return [0];

  const STOP_WORDS = new Set([
    "the", "and", "for", "with", "from", "that", "this", "into",
    "over", "under", "about", "their", "other", "have", "been",
    "will", "when", "which", "where", "portfolio", "investment",
  ]);

  function signalWords(title: string): string[] {
    return title
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 5 && !STOP_WORDS.has(w));
  }

  const boundaries: number[] = [0]; // first reading always starts at page 0
  let searchFrom = 0;

  for (let r = 1; r < readingTitles.length; r++) {
    const signals = signalWords(readingTitles[r]);
    if (signals.length === 0) {
      // No signal words — fall back to evenly spaced
      boundaries.push(Math.floor((r / readingTitles.length) * pages.length));
      continue;
    }

    // Score each page from searchFrom onward
    // (don't look in the last 10% of pages to avoid boundary going too late)
    const lastPossible = Math.max(
      searchFrom + 5,
      pages.length - Math.floor(pages.length * 0.1)
    );

    let bestScore = 0;
    let bestPage = searchFrom + Math.floor((pages.length - searchFrom) / (readingTitles.length - r + 1));

    for (let p = searchFrom + 5; p <= lastPossible; p++) {
      // Look at a 3-page window centred on p
      const windowText = pages
        .slice(Math.max(0, p - 1), p + 2)
        .map((pg) => pg.text.toLowerCase())
        .join(" ");

      const score = signals.filter((w) => windowText.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestPage = p;
      }
    }

    // Only accept the detected boundary if we matched at least half the signals
    if (bestScore >= Math.max(1, Math.floor(signals.length / 2))) {
      boundaries.push(bestPage);
      searchFrom = bestPage + 1;
      console.log(
        `    ✓ Detected boundary for "${readingTitles[r]}" at page ${pages[bestPage].pageNum} (score ${bestScore}/${signals.length})`
      );
    } else {
      // Fall back: evenly space the remaining readings
      const remaining = readingTitles.length - r;
      const pagesLeft = pages.length - searchFrom;
      const fallbackPage = searchFrom + Math.floor(pagesLeft / (remaining + 1));
      boundaries.push(fallbackPage);
      searchFrom = fallbackPage + 1;
      console.log(
        `    ⚠ Weak match for "${readingTitles[r]}" — using page ${pages[fallbackPage].pageNum} (score ${bestScore}/${signals.length})`
      );
    }
  }

  return boundaries;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 3 || t.length > 120) return false;
  if (/learning\s+outcome/i.test(t)) return true;
  if (/^\s*LOS\s+\d+/i.test(t)) return true;
  // All-caps with at least 2 words
  if (/^[A-Z0-9\s\-:,\.&\/()]+$/.test(t) && t.length < 80 && t.split(/\s+/).length >= 2) return true;
  // Numbered sections
  if (/^(Section\s+\d+|\d+\.\d*|[A-Z]\.|[IVX]+\.)\s+/i.test(t)) return true;
  return false;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHTML(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let html = "";
  let inList = false;

  for (const line of lines) {
    if (isHeading(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escapeHTML(line)}</h2>`;
    } else if (/^[\u2022\-\*]\s/.test(line) || /^\d+\.\s[A-Z]/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${escapeHTML(line.replace(/^[\u2022\-\*\d\.]\s+/, ""))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${escapeHTML(line)}</p>`;
    }
  }

  if (inList) html += "</ul>";
  return html;
}

function extractLearningOutcomes(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const outcomes: string[] = [];
  let inLOS = false;

  for (const line of lines) {
    if (/learning\s+outcome/i.test(line)) { inLOS = true; continue; }
    if (inLOS) {
      if (/^(describe|explain|demonstrate|evaluate|analyze|calculate|compare|contrast|identify|discuss|distinguish|formulate|construct|interpret|recommend|justify|critique|appraise|assess)/i.test(line)) {
        outcomes.push(line);
      } else if (outcomes.length > 0 && isHeading(line)) {
        break;
      }
    }
  }

  return outcomes.slice(0, 8);
}

function extractKeyTerms(text: string): string[] {
  const cfaTerms = [
    "efficient frontier", "sharpe ratio", "treynor ratio", "information ratio",
    "tracking error", "duration", "convexity", "immunization", "liability-driven",
    "mean-variance", "value at risk", "behavioral bias", "anchoring", "framing",
    "prospect theory", "momentum", "rebalancing", "GIPS", "attribution",
    "Black-Litterman", "futures overlay", "currency hedge", "carry trade",
    "private equity", "infrastructure", "real assets", "hedge fund",
    "long/short equity", "global macro", "factor model", "smart beta",
  ];
  const lower = text.toLowerCase();
  return cfaTerms.filter((t) => lower.includes(t.toLowerCase())).slice(0, 8);
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

interface Chunk { text: string; wordCount: number; }

function splitIntoChunks(text: string): Chunk[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let cur = "";
  let curWords = 0;

  for (const para of paragraphs) {
    const pw = countWords(para);
    if (curWords + pw > WORDS_PER_STAGE && curWords > WORDS_PER_STAGE * 0.5) {
      if (cur.trim()) chunks.push({ text: cur.trim(), wordCount: curWords });
      cur = para;
      curWords = pw;
    } else {
      cur += (cur ? "\n\n" : "") + para;
      curWords += pw;
    }
  }

  if (cur.trim()) chunks.push({ text: cur.trim(), wordCount: curWords });
  return chunks.filter((c) => c.wordCount > 50);
}

// ─── Stage writing ────────────────────────────────────────────────────────────

async function writeStages(
  readingId: string,
  topicId: string,
  readingTitle: string,
  topicTitle: string,
  text: string
): Promise<string[]> {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) return [];

  const safeId = readingId.replace(/[^a-z0-9-]/gi, "-");
  const stageIds = chunks.map((_, i) => `${safeId}-s${i + 1}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const stageId = stageIds[i];
    const firstLine = chunk.text.split("\n")[0].trim();
    const title =
      isHeading(firstLine) && firstLine.length < 80
        ? firstLine
        : `${readingTitle.split(":")[0]} — Part ${i + 1}`;

    const stage: StageJSON = {
      id: stageId,
      stageNumber: i + 1,
      totalStages: chunks.length,
      readingId,
      topicId,
      title,
      readingTitle,
      topicTitle,
      wordCount: chunk.wordCount,
      estimatedMinutes: Math.max(5, Math.min(30, Math.round(chunk.wordCount / AVG_READING_WPM))),
      content: textToHTML(chunk.text),
      learningOutcomes: extractLearningOutcomes(chunk.text),
      keyTerms: extractKeyTerms(chunk.text),
      prevStageId: i > 0 ? stageIds[i - 1] : null,
      nextStageId: i < chunks.length - 1 ? stageIds[i + 1] : null,
    };

    await fs.writeFile(
      path.join(STAGES_DIR, `${stageId}.json`),
      JSON.stringify(stage, null, 2),
      "utf-8"
    );
  }

  return stageIds;
}

// ─── Volume processor ─────────────────────────────────────────────────────────

async function processVolume(
  pdfFilename: string,
  readingIds: string[],
  curriculum: Curriculum
): Promise<Map<string, string[]>> {
  const pdfPath = path.join(PDF_DIR, pdfFilename);
  const results = new Map<string, string[]>();

  // Check file exists
  try {
    await fs.access(pdfPath);
  } catch {
    console.warn(`  ⚠ Not found: ${pdfFilename} — skipping`);
    return results;
  }

  console.log(`\n  Extracting pages from ${pdfFilename}…`);
  const pages = await extractPagesFromPDF(pdfPath);
  console.log(`  → ${pages.length} pages extracted`);

  // Resolve reading metadata from curriculum
  const readings: { id: string; title: string; topicId: string; topicTitle: string }[] = [];
  for (const readingId of readingIds) {
    for (const topic of curriculum.topics) {
      const reading = topic.readings.find((r) => r.id === readingId);
      if (reading) {
        readings.push({
          id: readingId,
          title: reading.title,
          topicId: topic.id,
          topicTitle: topic.title,
        });
        break;
      }
    }
  }

  if (readings.length === 0) {
    console.warn("  ⚠ No matching readings found in curriculum for this volume");
    return results;
  }

  // Detect where each reading starts within the volume
  console.log(`  Detecting boundaries for ${readings.length} reading(s)…`);
  const readingTitles = readings.map((r) => r.title);
  const boundaries = detectReadingBoundaries(pages, readingTitles);

  // Extract text for each reading segment and write stages
  for (let r = 0; r < readings.length; r++) {
    const reading = readings[r];
    const startPage = boundaries[r];
    const endPage = r < boundaries.length - 1 ? boundaries[r + 1] : pages.length;

    const segmentText = pages
      .slice(startPage, endPage)
      .map((p) => p.text)
      .join("\n");

    const wordCount = countWords(segmentText);
    console.log(
      `  [${reading.id}] "${reading.title}" — pages ${startPage + 1}–${endPage}, ${wordCount.toLocaleString()} words`
    );

    if (wordCount < 100) {
      console.warn(`    ⚠ Very little text — boundary may be off. Check VOLUME_MAP.`);
    }

    const stageIds = await writeStages(
      reading.id,
      reading.topicId,
      reading.title,
      reading.topicTitle,
      segmentText
    );

    console.log(`    → ${stageIds.length} stages written`);
    results.set(reading.id, stageIds);
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("CFA Level 3 PDF Processor — 2026");
  console.log("=".repeat(50));

  const curriculumRaw = await fs.readFile(CURRICULUM_PATH, "utf-8");
  const curriculum: Curriculum = JSON.parse(curriculumRaw);

  await fs.mkdir(STAGES_DIR, { recursive: true });

  let totalStages = 0;

  for (const [pdfFilename, readingIds] of Object.entries(VOLUME_MAP)) {
    console.log(`\nVolume: ${pdfFilename}`);
    const results = await processVolume(pdfFilename, readingIds, curriculum);

    // Update curriculum with new stage data
    for (const [readingId, stageIds] of results.entries()) {
      for (const topic of curriculum.topics) {
        const reading = topic.readings.find((r) => r.id === readingId);
        if (reading) {
          reading.stageCount = stageIds.length;
          reading.stages = stageIds;
          totalStages += stageIds.length;
        }
      }
    }
  }

  await fs.writeFile(CURRICULUM_PATH, JSON.stringify(curriculum, null, 2), "utf-8");

  console.log("\n" + "=".repeat(50));
  console.log(`Done — ${totalStages} total stages written`);

  if (totalStages === 0) {
    console.log("\n  Make sure your PDFs are in the /pdfs folder and filenames");
    console.log("  match those in VOLUME_MAP at the top of this script.");
  } else {
    console.log(`  Stages: ${STAGES_DIR}`);
    console.log(`  Curriculum: ${CURRICULUM_PATH}`);
    console.log("\n  Run 'npm run build' or 'npm run dev' to see your content.");
  }
}

main().catch(console.error);
