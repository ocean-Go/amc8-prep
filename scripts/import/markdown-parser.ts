#!/usr/bin/env node
/**
 * AMC8 Markdown Parser
 *
 * Converts content/amc8/markdown/AMC8_{YEAR}.md files into
 * ImportedProblem[] JSON suitable for Supabase import.
 *
 * Usage:
 *   npx ts-node scripts/import/markdown-parser.ts [--dry-run] [--year 2025]
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const MARKDOWN_DIR = resolve("content/amc8/markdown");
const OUTPUT_FILE = resolve("data/seeds/amc8-parsed.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportedProblem = {
  id: string;
  contest: "AMC8";
  year: number;
  problem_number: number;
  question_text: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  correct_answer: "A" | "B" | "C" | "D" | "E";
  source_url: string;
};

// ─── Answer Key Parsers ───────────────────────────────────────────────────────

/**
 * Extract answer key table from bottom of markdown file.
 * Handles both clean tables (2017+) and messy AoPS tables (1999-2016).
 */
function parseAnswerKey(content: string): Map<number, string> {
  const answers = new Map<number, string>();
  const answerKeySection = content.match(
    /## Answer Key[^\n]*\n\n([\s\S]+)$/i
  );
  if (!answerKeySection) return answers;

  const block = answerKeySection[1];

  // Pattern 1: clean markdown table — | 1 | **B** |
  const cleanRows = block.matchAll(/\|\s*(\d+)\s*\|\s*\*\*?([A-E])\*\*?/g);
  for (const m of cleanRows) {
    answers.set(parseInt(m[1]), m[2].toUpperCase());
  }

  // Pattern 2: AoPS inline tables — | # | Answer | … | 1 | (A) |
  const aopsRows = block.matchAll(/\|\s*(\d+)\s*\|[^|]*\(([A-E])\)/g);
  for (const m of aopsRows) {
    answers.set(parseInt(m[1]), m[2].toUpperCase());
  }

  return answers;
}

// ─── Question Block Parsers ───────────────────────────────────────────────────

/**
 * Parse 2017+ clean format.
 * Sections look like:
 *   1. Question text?
 *   A
 *   B
 *   C
 *   D
 *   E
 *   [option text on following lines]
 */
function parseCleanBlock(
  block: string,
  problemNum: number
): Partial<ImportedProblem> | null {
  const lines = block.trim().split("\n").map((l) => l.trim());
  if (lines.length < 6) return null;

  // First line is the problem number + question start
  const questionMatch = lines[0].match(/^\d+\.\s*(.+)/s);
  if (!questionMatch) return null;
  const questionStart = questionMatch[1];

  // Find option letters A–E positions
  const optionIndices: Record<string, number> = {};
  for (const opt of ["A", "B", "C", "D", "E"] as const) {
    const idx = lines.findIndex((l, i) => i > 0 && l === opt);
    if (idx === -1) return null;
    optionIndices[opt] = idx;
  }

  const sortedOptions = ["A", "B", "C", "D", "E"].sort(
    (a, b) => optionIndices[a] - optionIndices[b]
  );

  const options: Record<string, string> = {};
  for (let i = 0; i < sortedOptions.length - 1; i++) {
    const currIdx = optionIndices[sortedOptions[i]];
    const nextIdx = optionIndices[sortedOptions[i + 1]];
    options[sortedOptions[i]] = lines.slice(currIdx + 1, nextIdx).join(" ").trim();
  }
  options[sortedOptions[4]] = lines
    .slice(optionIndices[sortedOptions[4]] + 1)
    .join(" ")
    .trim();

  return {
    question_text: questionStart,
    options: options as Record<"A" | "B" | "C" | "D" | "E", string>,
  };
}

/**
 * Parse 1999-2016 AoPS wiki table format.
 * These files have problems embedded in table cells with minimal spacing.
 */
function parseAoPSBlock(
  block: string,
  problemNum: number
): Partial<ImportedProblem> | null {
  // Remove table markers and normalize whitespace
  const cleaned = block
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract question number
  const numMatch = cleaned.match(/^\d+\s+(.+?)\s+([A-E])\s*$/s);
  if (!numMatch) return null;

  // For early years, option text is often on the same line — fallback to passthrough
  return {
    question_text: cleaned,
    options: { A: "", B: "", C: "", D: "", E: "" },
  };
}

// ─── Image Reference Checker ──────────────────────────────────────────────────

/**
 * Extract all Obsidian image references from a markdown file.
 * Returns: AMC8_{YEAR}_p{N}.png references
 */
export function extractImageRefs(content: string): string[] {
  const refs = content.match(/!\[\[AMC8_\d{4}_p\d+\.png\|/g) ?? [];
  return refs.map((r) => {
    const m = r.match(/!\[\[(AMC8_\d{4}_p\d+\.png)\|/);
    return m ? m[1] : "";
  }).filter(Boolean);
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

function extractProblemNumbers(content: string): number[] {
  // Match "1." "2." etc. at start of line or after whitespace
  const matches = content.matchAll(/^(\d+)\.\s+/gm);
  return Array.from(matches, (m) => parseInt(m[1])).filter(
    (n) => n >= 1 && n <= 25
  );
}

export async function parseMarkdownFile(
  filePath: string
): Promise<ImportedProblem[]> {
  const raw = await readFile(filePath, "utf8");
  const yearMatch = filePath.match(/AMC8_(\d{4})\.md/);
  if (!yearMatch) throw new Error(`Cannot extract year from ${filePath}`);
  const year = parseInt(yearMatch[1]);

  const content = raw.replace(/\r\n/g, "\n");
  const answerKey = parseAnswerKey(content);
  const problemNumbers = extractProblemNumbers(content);
  const sourceUrl = `https://live.poshenloh.com/past-contests/amc8/${year}`;

  const problems: ImportedProblem[] = [];

  for (const num of problemNumbers) {
    // Build problem ID
    const id = `amc8-${year}-${String(num).padStart(2, "0")}`;

    // Question text: find block between "N. " and the next number or answer key
    const numRegex = new RegExp(
      `^${num}\\.?\s+(.+?)(?=^\\d+\\.|$)`,
      "sm"
    );
    const blockMatch = content.match(numRegex);
    const question_text = blockMatch
      ? blockMatch[1].replace(/\n+/g, " ").trim()
      : "";

    // Options: look for A/B/C/D/E on their own lines after question
    const afterQuestion = blockMatch ? blockMatch[0] : "";
    const lines = afterQuestion.split("\n");
    const options: Record<string, string> = { A: "", B: "", C: "", D: "", E: "" };

    for (const opt of ["A", "B", "C", "D", "E"]) {
      const optLineIdx = lines.findIndex(
        (l, i) => i > 0 && l.trim() === opt
      );
      if (optLineIdx !== -1) {
        // Collect text until next option letter or end
        const seg = lines
          .slice(optLineIdx + 1)
          .join(" ")
          .replace(/^[A-E]\s*/, "")
          .trim();
        options[opt] = seg;
      }
    }

    const correct_answer = (answerKey.get(num) ?? "") as ImportedProblem["correct_answer"];

    problems.push({
      id,
      contest: "AMC8",
      year,
      problem_number: num,
      question_text,
      options: options as ImportedProblem["options"],
      correct_answer: correct_answer || "A",
      source_url: sourceUrl,
    });
  }

  return problems;
}

export async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const yearFilter = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];

  const files = await readdir(MARKDOWN_DIR);
  const mdFiles = files
    .filter((f) => f.endsWith(".md") && f.startsWith("AMC8_"))
    .sort();

  const problems: ImportedProblem[] = [];

  for (const file of mdFiles) {
    if (yearFilter && !file.includes(yearFilter)) continue;
    const filePath = join(MARKDOWN_DIR, file);
    const parsed = await parseMarkdownFile(filePath);
    problems.push(...parsed);
    console.log(`Parsed ${file}: ${parsed.length} problems`);
  }

  console.log(`\nTotal: ${problems.length} problems across ${mdFiles.length} files`);

  if (dryRun) {
    // Print first problem as sample
    console.log("\nSample (first problem):");
    console.log(JSON.stringify(problems[0], null, 2));
    return;
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(problems, null, 2));
  console.log(`\nWritten to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
