import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PracticeProblem } from "@/lib/types/practice";

export type ProblemWithAnswer = PracticeProblem & {
  answer: string;
  explanation?: string | null;
  source: "normalized-json" | "mock";
};

type NormalizedProblem = {
  problem_id: string;
  contest: string | null;
  year: number | null;
  problem_number: number | null;
  question_text_raw: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  answer?: string | null;
  explanation?: string | null;
  parse_status?: "parsed" | "placeholder";
};

const MOCK_PROBLEMS: ProblemWithAnswer[] = [
  {
    id: "mock-2023-1",
    year: 2023,
    contest: "AMC 8",
    number: 1,
    topic: "Number Theory",
    question_text: "What is the value of 24 ÷ 6 + 3?",
    options: ["1", "4", "7", "9", "27"],
    answer: "C",
    explanation: "24 ÷ 6 + 3 = 4 + 3 = 7.",
    source: "mock",
  },
  {
    id: "mock-2022-5",
    year: 2022,
    contest: "AMC 8",
    number: 5,
    topic: "Geometry",
    question_text: "A square has side length 4. What is its area?",
    options: ["8", "12", "16", "20", "24"],
    answer: "C",
    explanation: "Area = 4 × 4 = 16.",
    source: "mock",
  },
  {
    id: "mock-2021-9",
    year: 2021,
    contest: "AMC 8",
    number: 9,
    topic: "Algebra",
    question_text: "If x + 5 = 12, what is x?",
    options: ["5", "6", "7", "8", "17"],
    answer: "C",
    explanation: "x = 12 - 5 = 7.",
    source: "mock",
  },
];

function normalizeAnswer(answer: string | null | undefined): string | null {
  const normalized = answer?.trim().toUpperCase();
  return normalized && /^[A-E]$/.test(normalized) ? normalized : null;
}

function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((item) => String(item));
  }

  if (options && typeof options === "object") {
    const record = options as Record<string, unknown>;
    return ["A", "B", "C", "D", "E"].map((letter) => String(record[letter] ?? ""));
  }

  return ["", "", "", "", ""];
}

function toProblemWithAnswer(problem: NormalizedProblem): ProblemWithAnswer | null {
  const answer = normalizeAnswer(problem.answer);
  if (!answer || problem.parse_status === "placeholder") {
    return null;
  }

  return {
    id: problem.problem_id,
    year: problem.year,
    contest: problem.contest,
    number: problem.problem_number,
    topic: "General",
    question_text: problem.question_text_raw,
    options: normalizeOptions(problem.options),
    answer,
    explanation: problem.explanation ?? null,
    source: "normalized-json",
  };
}

async function readNormalizedProblemFile(): Promise<NormalizedProblem[]> {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "content/amc8/normalized/all-problems.json"),
    path.resolve(cwd, "../content/amc8/normalized/all-problems.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as NormalizedProblem[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next candidate. The app can still use mock fixtures.
    }
  }

  return [];
}

export async function loadLocalProblemsWithAnswers(): Promise<ProblemWithAnswer[]> {
  const normalized = await readNormalizedProblemFile();
  const gradable = normalized
    .map(toProblemWithAnswer)
    .filter((problem): problem is ProblemWithAnswer => problem !== null);

  return gradable.length > 0 ? gradable : MOCK_PROBLEMS;
}

export async function loadPracticeProblems(topic: string | null): Promise<{
  problems: PracticeProblem[];
  source: "normalized-json" | "mock";
  warning?: string;
}> {
  const problemsWithAnswers = await loadLocalProblemsWithAnswers();
  const source = problemsWithAnswers[0]?.source ?? "mock";
  const filtered =
    !topic || topic === "all"
      ? problemsWithAnswers
      : problemsWithAnswers.filter((problem) => problem.topic === topic);

  return {
    problems: filtered.map(({ answer: _answer, explanation: _explanation, source: _source, ...problem }) => problem),
    source,
    warning:
      source === "normalized-json"
        ? "Showing only locally normalized problems that have answer keys and can be graded."
        : "Using built-in mock problems because no gradable local problem set was available.",
  };
}

export async function findLocalProblem(problemId: string): Promise<ProblemWithAnswer | null> {
  const problems = await loadLocalProblemsWithAnswers();
  return problems.find((problem) => problem.id === problemId) ?? null;
}
