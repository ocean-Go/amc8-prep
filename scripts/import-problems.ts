import { readFile } from 'node:fs/promises';
import process from 'node:process';

type SampleProblem = {
  id: string;
  contest: 'AMC8';
  year: number;
  problem_number: number;
  question_text: string;
  options: Record<'A' | 'B' | 'C' | 'D' | 'E', string>;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  source_url: string;
};

const DATA_FILE = 'data/seeds/amc8-sample.json';

function assertValid(problem: SampleProblem): void {
  const choiceKeys = Object.keys(problem.options).sort().join('');
  if (!problem.id.startsWith('amc8-')) {
    throw new Error(`Invalid id format: ${problem.id}`);
  }
  if (problem.contest !== 'AMC8') {
    throw new Error(`Invalid contest for ${problem.id}`);
  }
  if (choiceKeys !== 'ABCDE') {
    throw new Error(`Invalid options keys for ${problem.id}: expected A-E`);
  }
  if (!(problem.correct_answer in problem.options)) {
    throw new Error(`Correct answer is not in options for ${problem.id}`);
  }
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = process.argv.includes('--dry-run');

  const raw = await readFile(DATA_FILE, 'utf8');
  const sampleProblems = JSON.parse(raw) as SampleProblem[];

  sampleProblems.forEach(assertValid);

  const rows = sampleProblems.map((problem) => ({
    // Required sample schema fields.
    id: problem.id,
    contest: problem.contest,
    year: problem.year,
    problem_number: problem.problem_number,
    question_text: problem.question_text,
    options: problem.options,
    correct_answer: problem.correct_answer,
    source_url: problem.source_url,

    // Compatibility fields for the existing migration schema.
    source: problem.source_url,
    number: problem.problem_number,
    question: problem.question_text,
    answer: problem.correct_answer,
    topic: 'General',
    difficulty: 1,
    methods: [],
    hints: []
  }));

  if (dryRun) {
    console.log(`Dry run: validated ${rows.length} AMC8 sample problems from ${DATA_FILE}.`);
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const endpoint = `${supabaseUrl}/rest/v1/problems?on_conflict=id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Import failed (${response.status}): ${message}`);
  }

  const inserted = (await response.json()) as Array<{ id: string }>;
  console.log(`Imported ${inserted.length} AMC8 problems into problems table.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
