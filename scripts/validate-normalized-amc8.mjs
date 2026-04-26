import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const NORMALIZED_DIR = path.join(ROOT_DIR, 'content', 'amc8', 'normalized');
const MARKDOWN_DIR = path.join(ROOT_DIR, 'content', 'amc8', 'markdown');
const REPORT_PATH = path.join(NORMALIZED_DIR, 'validation-report.json');

function hasChoices(problem) {
  const options = problem?.options ?? {};
  return ['A', 'B', 'C', 'D', 'E'].every((key) => typeof options[key] === 'string' && options[key].trim().length > 0);
}

async function main() {
  const normalizedFiles = (await fs.readdir(NORMALIZED_DIR))
    .filter((file) => /^AMC8_\d{4}\.json$/.test(file))
    .sort();

  const markdownFiles = new Set((await fs.readdir(MARKDOWN_DIR)).filter((file) => /^AMC8_\d{4}\.md$/.test(file)));
  const allIds = new Set();
  const duplicateIds = new Set();
  const yearly = [];
  let emptyQuestionCount = 0;

  for (const file of normalizedFiles) {
    const year = Number(file.match(/(\d{4})/)?.[1]);
    const raw = await fs.readFile(path.join(NORMALIZED_DIR, file), 'utf8');
    const problems = JSON.parse(raw);

    const missingNumbers = [];
    const numbers = new Set();
    let missingRequiredFieldCount = 0;
    let invalidChoicesCount = 0;
    let unresolvedImageRefCount = 0;
    let placeholder_count = 0;

    for (const problem of problems) {
      if (problem.parse_status === "placeholder") {
        placeholder_count += 1;
      }

      if (!problem.problem_id || typeof problem.problem_number !== 'number' || !problem.question_text_raw) {
        missingRequiredFieldCount += 1;
      }
      if (!hasChoices(problem)) {
        invalidChoicesCount += 1;
      }
      if (!problem.question_text_raw || !problem.question_text_raw.trim()) {
        emptyQuestionCount += 1;
      }

      numbers.add(problem.problem_number);

      if (allIds.has(problem.problem_id)) {
        duplicateIds.add(problem.problem_id);
      }
      allIds.add(problem.problem_id);

      for (const imageRef of problem.image_refs ?? []) {
        const diskPath = path.join(ROOT_DIR, imageRef);
        try {
          await fs.access(diskPath);
        } catch {
          unresolvedImageRefCount += 1;
        }
      }
    }

    for (let i = 1; i <= 25; i += 1) {
      if (!numbers.has(i)) {
        missingNumbers.push(i);
      }
    }

    yearly.push({
      year,
      markdown_present: markdownFiles.has(`AMC8_${year}.md`),
      normalized_file: `content/amc8/normalized/${file}`,
      problem_count: problems.length,
      missing_required_field_count: missingRequiredFieldCount,
      invalid_choices_count: invalidChoicesCount,
      missing_problem_numbers: missingNumbers,
      unresolved_image_ref_count: unresolvedImageRefCount,
      placeholder_count,
    });
  }

  const presentYears = yearly.map((entry) => entry.year).sort((a, b) => a - b);
  const malformedExcludingMissingSource = yearly
    .filter((entry) => entry.markdown_present)
    .reduce(
      (sum, entry) =>
        sum +
        entry.missing_problem_numbers.length +
        entry.missing_required_field_count +
        entry.invalid_choices_count,
      0
    );

  const report = {
    generated_at: new Date().toISOString(),
    year_coverage: {
      years_present: presentYears,
      year_2021_present: presentYears.includes(2021),
      year_2021_explanation: markdownFiles.has('AMC8_2021.md')
        ? 'AMC8_2021.md exists and is included in normalized output.'
        : 'AMC8_2021.md is missing from content/amc8/markdown. AMC8_2021.json is emitted as an intentional empty placeholder to keep year coverage explicit.',
    },
    per_year_integrity: yearly,
    canonical_sanity_checks: {
      duplicate_problem_ids: Array.from(duplicateIds).sort(),
      duplicate_problem_id_count: duplicateIds.size,
      empty_question_text_count: emptyQuestionCount,
      malformed_problem_count_excluding_missing_source_years: malformedExcludingMissingSource,
      placeholder_problem_count: yearly.reduce((sum, entry) => sum + entry.placeholder_count, 0),
      years_with_missing_problem_numbers: yearly
        .filter((entry) => entry.missing_problem_numbers.length > 0)
        .map((entry) => ({ year: entry.year, missing_problem_numbers: entry.missing_problem_numbers })),
    },
    runtime_verification: {
      expected_api_source: 'normalized-json',
      fallback_source: 'mock',
      note:
        'Runtime verification is performed by /api/problems route logic: normalized JSON is loaded first, and mock is returned only when normalized and database sources are unavailable.',
    },
  };

  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Years present: ${presentYears.join(', ')}`);
  console.log(`2021 present: ${report.year_coverage.year_2021_present}`);
  console.log(`Duplicate problem IDs: ${duplicateIds.size}`);
  console.log(`Empty question_text_raw count: ${emptyQuestionCount}`);
  console.log(`Malformed problems (excluding missing-source years): ${malformedExcludingMissingSource}`);
  console.log(`Placeholder problems: ${yearly.reduce((sum, entry) => sum + entry.placeholder_count, 0)}`);
  console.log(`Wrote report: content/amc8/normalized/validation-report.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
