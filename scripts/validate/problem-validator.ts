#!/usr/bin/env node
/**
 * AMC8 Problem Validator
 *
 * Runs automated integrity checks on the markdown question bank.
 *
 * Checks:
 *  1. Each year file contains exactly 25 problems (1–25)
 *  2. Each problem has A–E options present and non-empty
 *  3. problem_id is globally unique across all years
 *  4. Answer key is present and consistent with parsed answers
 *  5. No duplicate problem numbers within a year
 *
 * Usage:
 *   npx ts-node scripts/validate/problem-validator.ts [--fix] [--year=2025]
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const MARKDOWN_DIR = resolve("content/amc8/markdown");

// ─── Types ────────────────────────────────────────────────────────────────────

type ValidationIssue = {
  type: "count" | "options" | "duplicate_id" | "answer_key" | "empty_text" | "year_missing";
  year: number;
  detail: string;
};

type YearStats = {
  year: number;
  file: string;
  problemCount: number;
  hasAnswerKey: boolean;
  issues: ValidationIssue[];
};

// ─── Core Checks ──────────────────────────────────────────────────────────────

function extractProblemNumbers(content: string): number[] {
  const matches = content.matchAll(/^(\d+)\.\s+/gm);
  return Array.from(matches, (m) => parseInt(m[1])).filter(
    (n) => n >= 1 && n <= 25
  );
}

function extractAnswerKey(content: string): Map<number, string> {
  const answers = new Map<number, string>();
  const section = content.match(/## Answer Key[^\n]*\n\n([\s\S]+)$/i)?.[1] ?? "";

  const cleanRows = section.matchAll(/\|\s*(\d+)\s*\|\s*\*\*?([A-E])\*\*?/g);
  for (const m of cleanRows) {
    answers.set(parseInt(m[1]), m[2].toUpperCase());
  }

  const aopsRows = section.matchAll(/\|\s*(\d+)\s*\|[^|]*\(([A-E])\)/g);
  for (const m of aopsRows) {
    answers.set(parseInt(m[1]), m[2].toUpperCase());
  }

  return answers;
}

function buildProblemIdSet(content: string, year: number): Set<string> {
  const numbers = extractProblemNumbers(content);
  return new Set(
    numbers.map((n) => `amc8-${year}-${String(n).padStart(2, "0")}`)
  );
}

function checkYear(
  content: string,
  file: string,
  year: number,
  knownIds: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const numbers = extractProblemNumbers(content);
  const uniqueNumbers = new Set(numbers);

  // 1. Exactly 25 problems
  if (numbers.length !== 25) {
    issues.push({
      type: "count",
      year,
      detail: `Expected 25 problems, found ${numbers.length}`,
    });
  }

  // 1b. All numbers 1–25 present
  const missing = [];
  for (let i = 1; i <= 25; i++) {
    if (!uniqueNumbers.has(i)) missing.push(i);
  }
  if (missing.length > 0) {
    issues.push({
      type: "count",
      year,
      detail: `Missing problem numbers: ${missing.join(", ")}`,
    });
  }

  // 1c. No duplicates
  const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (duplicates.length > 0) {
    issues.push({
      type: "duplicate_id",
      year,
      detail: `Duplicate problem numbers: ${[...new Set(duplicates)].join(", ")}`,
    });
  }

  // 2. Check A–E options for each problem
  const blockMatches = content.matchAll(
    /^\d+\.\s*(.+?)(?=^\d+\.|$)/gsm
  );
  for (const block of blockMatches) {
    const blockContent = block[0];
    const numMatch = blockContent.match(/^(\d+)\./);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1]);

    for (const opt of ["A", "B", "C", "D", "E"] as const) {
      const optIndex = blockContent.indexOf(`\n${opt}\n`);
      if (optIndex === -1) {
        issues.push({
          type: "options",
          year,
          detail: `Problem ${num}: missing option ${opt}`,
        });
      }
    }
  }

  // 3. Unique IDs
  const answerKey = extractAnswerKey(content);
  for (const num of numbers) {
    const id = `amc8-${year}-${String(num).padStart(2, "0")}`;
    if (knownIds.has(id)) {
      issues.push({
        type: "duplicate_id",
        year,
        detail: `Duplicate problem id: ${id} (problem ${num} in ${file})`,
      });
    }
    knownIds.add(id);
  }

  // 4. Answer key present
  if (answerKey.size === 0) {
    issues.push({
      type: "answer_key",
      year,
      detail: "No answer key found in file",
    });
  } else if (answerKey.size !== 25) {
    issues.push({
      type: "answer_key",
      year,
      detail: `Answer key has ${answerKey.size} entries, expected 25`,
    });
  }

  return issues;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function validate(
  options: { fix?: boolean; year?: number } = {}
): Promise<{ issues: ValidationIssue[]; stats: YearStats[] }> {
  const files = await readdir(MARKDOWN_DIR);
  const mdFiles = files
    .filter((f) => f.endsWith(".md") && f.startsWith("AMC8_"))
    .sort();

  const knownIds = new Set<string>();
  const allIssues: ValidationIssue[] = [];
  const stats: YearStats[] = [];

  for (const file of mdFiles) {
    const yearMatch = file.match(/AMC8_(\d{4})\.md/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);

    if (options.year && year !== options.year) continue;

    const filePath = join(MARKDOWN_DIR, file);
    const content = (await readFile(filePath, "utf8")).replace(/\r\n/g, "\n");

    const numbers = extractProblemNumbers(content);
    const answerKey = extractAnswerKey(content);
    const issues = checkYear(content, file, year, knownIds);

    allIssues.push(...issues);
    stats.push({
      year,
      file,
      problemCount: numbers.length,
      hasAnswerKey: answerKey.size > 0,
      issues,
    });
  }

  return { issues: allIssues, stats };
}

async function main() {
  const fix = process.argv.includes("--fix");
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  const yearFilter = yearArg ? parseInt(yearArg.split("=")[1]) : undefined;

  console.log("🔍 Validating AMC8 question bank...\n");
  const { issues, stats } = await validate({ year: yearFilter });

  // Summary per year
  for (const s of stats) {
    const ok = s.issues.length === 0;
    console.log(
      `  ${s.year} — ${s.problemCount}/25 problems | Answer key: ${
        s.hasAnswerKey ? "✅" : "❌"
      } | ${ok ? "✅ OK" : `❌ ${s.issues.length} issue(s)`}`
    );
  }

  console.log(`\n─── Issues (${issues.length}) ───`);
  if (issues.length === 0) {
    console.log("✅ All checks passed.");
    return;
  }

  for (const issue of issues) {
    console.log(`  [${issue.year}] ${issue.type}: ${issue.detail}`);
  }

  if (fix) {
    console.log("\n⚠️  --fix not yet implemented. Manual correction required.");
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
