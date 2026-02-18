/**
 * CFA Level 3 PDF Processing Script
 *
 * Place your CFA PDF files in the /pdfs folder with names like:
 *   topic-1-behavioral-finance.pdf
 *   topic-2-capital-market-expectations.pdf
 *   ...etc
 *
 * Or you can configure TOPIC_PDF_MAP below to map topic IDs to PDF filenames.
 *
 * Run with:
 *   npx tsx scripts/process-pdfs.ts
 *
 * Output:
 *   public/content/stages/<stageId>.json  (one file per stage)
 *   public/content/curriculum.json        (updated with stage counts)
 */

import { promises as fs } from "fs";
import path from "path";

// ─── Configuration ────────────────────────────────────────────────────────────

const WORDS_PER_STAGE = 2000; // ~15-20 minutes of dense reading
const PDF_DIR = path.join(process.cwd(), "..", "pdfs");
const STAGES_DIR = path.join(process.cwd(), "public", "content", "stages");
const CURRICULUM_PATH = path.join(process.cwd(), "public", "content", "curriculum.json");
const AVG_READING_WPM = 120; // CFA-level reading pace

/**
 * Map reading IDs to PDF filenames.
 * Key = reading ID from curriculum.json (e.g. "1-1")
 * Value = PDF filename in /pdfs folder (without path)
 *
 * Example:
 *   "1-1": "behavioral-biases-of-individuals.pdf"
 *
 * If a PDF covers multiple readings in one file, you can map them
 * all to the same PDF and the script will split the text evenly.
 */
const READING_PDF_MAP: Record<string, string> = {
  // Fill these in with your actual PDF filenames:
  // "1-1": "topic-1-reading-1.pdf",
  // "1-2": "topic-1-reading-2.pdf",
  // "2-1": "topic-2-reading-1.pdf",
  // etc.
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

// ─── PDF text extraction ─────────────────────────────────────────────────────

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    // Dynamic import to avoid issues if pdfjs-dist isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

    const data = await fs.readFile(pdfPath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (err) {
    console.error(`Failed to extract text from ${pdfPath}:`, err);
    return "";
  }
}

// ─── Text processing ──────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Detect if a line is likely a section heading.
 * CFA materials use:
 *  - All-caps lines under 80 chars
 *  - Lines starting with numbered patterns (1., A., I.)
 *  - Lines containing "LEARNING OUTCOME" or "LOS"
 */
function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;
  if (trimmed.length > 120) return false;

  // LOS marker
  if (/learning\s+outcome/i.test(trimmed)) return true;
  if (/^\s*LOS\s+\d+/i.test(trimmed)) return true;

  // All caps (allow numbers, spaces, punctuation)
  if (/^[A-Z0-9\s\-:,\.&\/()]+$/.test(trimmed) && trimmed.length < 80) {
    // Must have at least 2 words or be a short title
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return true;
  }

  // Numbered section: "1.", "A.", "I.", "1.1", "Section 1"
  if (/^(Section\s+\d+|\d+\.\d*|[A-Z]\.|[IVX]+\.)\s+/i.test(trimmed)) return true;

  return false;
}

/**
 * Convert raw extracted text to clean HTML for the reader.
 */
function textToHTML(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let html = "";
  let inList = false;

  for (const line of lines) {
    if (isHeading(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escapeHTML(line)}</h2>`;
    } else if (/^[\u2022\-\*]\s/.test(line) || /^\d+\.\s/.test(line)) {
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

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Extract learning outcome statements from text.
 * Looks for lines after "LEARNING OUTCOME STATEMENTS" header.
 */
function extractLearningOutcomes(text: string): string[] {
  const outcomes: string[] = [];
  const lines = text.split("\n").map((l) => l.trim());

  let inLOS = false;
  for (const line of lines) {
    if (/learning\s+outcome/i.test(line)) {
      inLOS = true;
      continue;
    }
    if (inLOS) {
      // LOS items typically start with action verbs
      if (/^(describe|explain|demonstrate|evaluate|analyze|calculate|compare|contrast|identify|discuss|distinguish|formulate|construct|interpret|recommend|justify|critique|appraise|assess)/i.test(line)) {
        outcomes.push(line);
      } else if (outcomes.length > 0 && isHeading(line)) {
        // Reached next section
        break;
      }
    }
  }

  return outcomes.slice(0, 8); // cap at 8 per stage
}

/**
 * Extract key financial terms from text.
 */
function extractKeyTerms(text: string): string[] {
  // Common CFA L3 terms to highlight if present
  const cfaTerms = [
    "efficient frontier", "sharpe ratio", "treynor ratio", "information ratio",
    "tracking error", "alpha", "beta", "duration", "convexity", "immunization",
    "liability-driven", "factor model", "mean-variance", "Monte Carlo",
    "value at risk", "CVaR", "behavioral bias", "anchoring", "framing",
    "prospect theory", "momentum", "rebalancing", "overlay", "GIPS",
    "absolute return", "relative return", "benchmark", "attribution",
    "Black-Litterman", "ALM", "liability matching", "futures overlay",
    "currency hedge", "carry trade", "volatility", "correlation",
  ];

  const textLower = text.toLowerCase();
  return cfaTerms.filter((term) => textLower.includes(term.toLowerCase())).slice(0, 8);
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

interface Chunk {
  text: string;
  wordCount: number;
}

function splitIntoChunks(text: string): Chunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let currentText = "";
  let currentWords = 0;

  for (const para of paragraphs) {
    const paraWords = countWords(para);

    // If adding this paragraph would exceed limit AND we have content, start new chunk
    if (currentWords + paraWords > WORDS_PER_STAGE && currentWords > WORDS_PER_STAGE * 0.5) {
      if (currentText.trim()) {
        chunks.push({ text: currentText.trim(), wordCount: currentWords });
      }
      currentText = para;
      currentWords = paraWords;
    } else {
      currentText += (currentText ? "\n\n" : "") + para;
      currentWords += paraWords;
    }
  }

  if (currentText.trim()) {
    chunks.push({ text: currentText.trim(), wordCount: currentWords });
  }

  return chunks.filter((c) => c.wordCount > 50); // filter tiny chunks
}

// ─── Main processing ──────────────────────────────────────────────────────────

async function processReading(
  readingId: string,
  topicId: string,
  readingTitle: string,
  topicTitle: string,
  pdfFilename: string
): Promise<string[]> {
  const pdfPath = path.join(PDF_DIR, pdfFilename);

  console.log(`  Processing: ${pdfFilename}`);

  let text: string;
  try {
    await fs.access(pdfPath);
    text = await extractTextFromPDF(pdfPath);
  } catch {
    console.warn(`  ⚠ PDF not found: ${pdfPath}`);
    return [];
  }

  if (!text.trim()) {
    console.warn(`  ⚠ No text extracted from ${pdfFilename}`);
    return [];
  }

  const chunks = splitIntoChunks(text);
  const stageIds: string[] = [];

  console.log(`  → ${chunks.length} stages from ${countWords(text).toLocaleString()} words`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const stageNumber = i + 1;
    const safeReadingId = readingId.replace(/[^a-z0-9-]/gi, "-");
    const stageId = `${safeReadingId}-s${stageNumber}`;

    // Determine title from first heading in chunk or fallback
    const firstLine = chunk.text.split("\n")[0].trim();
    const title = isHeading(firstLine) && firstLine.length < 80
      ? firstLine
      : `Stage ${stageNumber}: ${readingTitle.split(":")[0]}`;

    const estimatedMinutes = Math.round(chunk.wordCount / AVG_READING_WPM);
    const learningOutcomes = extractLearningOutcomes(chunk.text);
    const keyTerms = extractKeyTerms(chunk.text);
    const content = textToHTML(chunk.text);

    const prevStageId = i > 0 ? `${safeReadingId}-s${i}` : null;
    const nextStageId = i < chunks.length - 1 ? `${safeReadingId}-s${i + 2}` : null;

    const stage: StageJSON = {
      id: stageId,
      stageNumber,
      totalStages: chunks.length,
      readingId,
      topicId,
      title,
      readingTitle,
      topicTitle,
      wordCount: chunk.wordCount,
      estimatedMinutes: Math.max(5, Math.min(30, estimatedMinutes)),
      content,
      learningOutcomes,
      keyTerms,
      prevStageId,
      nextStageId,
    };

    const stagePath = path.join(STAGES_DIR, `${stageId}.json`);
    await fs.writeFile(stagePath, JSON.stringify(stage, null, 2), "utf-8");
    stageIds.push(stageId);
  }

  return stageIds;
}

async function main() {
  console.log("CFA Level 3 PDF Processor");
  console.log("=".repeat(50));

  // Load curriculum
  const curriculumRaw = await fs.readFile(CURRICULUM_PATH, "utf-8");
  const curriculum: Curriculum = JSON.parse(curriculumRaw);

  // Ensure stages directory exists
  await fs.mkdir(STAGES_DIR, { recursive: true });

  let totalStages = 0;
  let processedReadings = 0;

  for (const topic of curriculum.topics) {
    console.log(`\nTopic ${topic.id}: ${topic.title}`);

    for (const reading of topic.readings) {
      const pdfFilename = READING_PDF_MAP[reading.id];

      if (!pdfFilename) {
        console.log(`  Reading ${reading.id}: No PDF mapped — skipping`);
        continue;
      }

      const stageIds = await processReading(
        reading.id,
        topic.id,
        reading.title,
        topic.title,
        pdfFilename
      );

      reading.stageCount = stageIds.length;
      reading.stages = stageIds;
      totalStages += stageIds.length;
      processedReadings++;
    }
  }

  // Update curriculum.json with new stage counts
  await fs.writeFile(CURRICULUM_PATH, JSON.stringify(curriculum, null, 2), "utf-8");

  console.log("\n" + "=".repeat(50));
  console.log(`Done! Processed ${processedReadings} readings → ${totalStages} stages`);
  console.log(`Stages saved to: ${STAGES_DIR}`);
  console.log(`Curriculum updated: ${CURRICULUM_PATH}`);

  if (totalStages === 0) {
    console.log("\n⚠ No stages generated. Make sure to:");
    console.log("  1. Place PDF files in the /pdfs folder");
    console.log("  2. Update READING_PDF_MAP in this script with your filenames");
  }
}

main().catch(console.error);
