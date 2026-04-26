import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PracticeProblem } from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type NormalizedProblem = {
  problem_id: string;
  contest: string | null;
  year: number | null;
  problem_number: number | null;
  question_text_raw: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  parse_status?: "parsed" | "placeholder";
};

const MOCK_PROBLEMS: PracticeProblem[] = [
  {
    id: "mock-2023-1",
    year: 2023,
    contest: "AMC 8",
    number: 1,
    topic: "Number Theory",
    question_text: "What is the value of 24 ÷ 6 + 3?",
    options: ["1", "4", "7", "9", "27"],
  },
  {
    id: "mock-2022-5",
    year: 2022,
    contest: "AMC 8",
    number: 5,
    topic: "Geometry",
    question_text: "A square has side length 4. What is its area?",
    options: ["8", "12", "16", "20", "24"],
  },
  {
    id: "mock-2021-9",
    year: 2021,
    contest: "AMC 8",
    number: 9,
    topic: "Algebra",
    question_text: "If x + 5 = 12, what is x?",
    options: ["5", "6", "7", "8", "17"],
  },
];

function getFallbackProblems(topic: string | null): PracticeProblem[] {
  if (!topic || topic === "all") {
    return MOCK_PROBLEMS;
  }

  return MOCK_PROBLEMS.filter((problem) => problem.topic === topic);
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

function toPracticeProblem(problem: NormalizedProblem): PracticeProblem {
  return {
    id: problem.problem_id,
    year: problem.year,
    contest: problem.contest,
    number: problem.problem_number,
    topic: "General",
    question_text: problem.question_text_raw,
    options: [problem.options.A, problem.options.B, problem.options.C, problem.options.D, problem.options.E],
  };
}

async function loadNormalizedProblems(topic: string | null): Promise<{ problems: PracticeProblem[]; placeholdersExcluded: number }> {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "content/amc8/normalized/all-problems.json"),
    path.resolve(cwd, "../content/amc8/normalized/all-problems.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as NormalizedProblem[];
      if (!Array.isArray(parsed)) {
        continue;
      }

      const parsedOnly = parsed.filter((problem) => problem.parse_status !== "placeholder");
      const allProblems = parsedOnly.map(toPracticeProblem);
      if (!topic || topic === "all") {
        return { problems: allProblems, placeholdersExcluded: parsed.length - parsedOnly.length };
      }

      return {
        problems: allProblems.filter((problem) => problem.topic === topic),
        placeholdersExcluded: parsed.length - parsedOnly.length,
      };
    } catch {
      // Continue trying next path candidate.
    }
  }

  return { problems: [], placeholdersExcluded: 0 };
}

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic");

  const normalized = await loadNormalizedProblems(topic);
  if (normalized.problems.length > 0) {
    return NextResponse.json({
      problems: normalized.problems,
      source: "normalized-json",
      warning:
        normalized.placeholdersExcluded > 0
          ? `Excluded ${normalized.placeholdersExcluded} placeholder problems pending OCR cleanup.`
          : undefined,
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      problems: getFallbackProblems(topic),
      source: "mock",
      warning: "Supabase credentials are not configured and normalized JSON was unavailable.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase
    .from("problems")
    .select("id, year, contest, problem_number, topic, question, options")
    .order("year", { ascending: false, nullsFirst: false })
    .order("problem_number", { ascending: true, nullsFirst: false })
    .limit(50);

  if (topic && topic !== "all") {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({
      problems: getFallbackProblems(topic),
      source: "mock",
      warning: `Database failed (${error.message}) and normalized JSON was unavailable.`,
    });
  }

  const problems: PracticeProblem[] = (data ?? []).map((problem) => ({
    id: problem.id,
    year: problem.year,
    contest: problem.contest,
    number: problem.problem_number,
    topic: problem.topic,
    question_text: problem.question,
    options: normalizeOptions(problem.options),
  }));

  if (problems.length === 0) {
    return NextResponse.json({
      problems: getFallbackProblems(topic),
      source: "mock",
      warning: "No problems returned from database and normalized JSON was unavailable.",
    });
  }

  return NextResponse.json({ problems, source: "database" });
}
