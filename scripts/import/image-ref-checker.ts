#!/usr/bin/env node
/**
 * AMC8 Image Reference Checker
 *
 * Validates that every Obsidian image reference in a markdown file
 * has a corresponding PNG in content/amc8/markdown/images/.
 *
 * Usage:
 *   npx ts-node scripts/import/image-ref-checker.ts [--year 2025]
 */

import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
// ─── Image Reference Extraction (inlined, no ESM import) ──────────────────────

function extractImageRefs(content: string): string[] {
  const refs = content.match(/!\[\[AMC8_\d{4}_p\d+\.png\|/g) ?? [];
  return refs
    .map((r) => {
      const m = r.match(/!\[\[(AMC8_\d{4}_p\d+\.png)\|/);
      return m ? m[1] : "";
    })
    .filter(Boolean);
}

const MARKDOWN_DIR = resolve("content/amc8/markdown");
const IMAGES_DIR = resolve("content/amc8/markdown/images");

interface RefIssue {
  file: string;
  missing: string[];
}

export async function checkImageRefs(year?: number): Promise<RefIssue[]> {
  const files = await readdir(MARKDOWN_DIR);
  const mdFiles = files
    .filter((f) => f.endsWith(".md") && f.startsWith("AMC8_"))
    .sort();

  const allAvailableImages = new Set(
    (await readdir(IMAGES_DIR)).filter((f) => f.endsWith(".png"))
  );

  const issues: RefIssue[] = [];

  for (const file of mdFiles) {
    if (year && !file.includes(String(year))) continue;

    const filePath = join(MARKDOWN_DIR, file);
    const content = await readFile(filePath, "utf8");
    const refs = extractImageRefs(content);

    const missing = refs.filter((ref) => !allAvailableImages.has(ref));
    if (missing.length > 0) {
      issues.push({ file, missing });
    }
  }

  return issues;
}

async function main() {
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  const year = yearArg ? parseInt(yearArg.split("=")[1]) : undefined;

  const issues = await checkImageRefs(year);

  if (issues.length === 0) {
    console.log("✅ All image references resolve correctly.");
    return;
  }

  console.log(`❌ ${issues.length} file(s) with broken image references:\n`);
  for (const { file, missing } of issues) {
    console.log(`  ${file}:`);
    for (const ref of missing) {
      console.log(`    - [[${ref}]]`);
    }
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
