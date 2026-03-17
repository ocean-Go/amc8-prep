import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  MockProblem,
  MockProblemListResponse,
  SubmitMockRequest,
  SubmitMockResponse,
} from "@/lib/types/mock";

const MOCK_QUESTION_COUNT = 25;
const MOCK_DURATION_SEC = 40 * 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

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

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("problems")
    .select("id, year, contest, number, topic, question, options")
    .order("year", { ascending: false, nullsFirst: false })
    .order("number", { ascending: true, nullsFirst: false })
    .limit(MOCK_QUESTION_COUNT);

  if (error) {
    return NextResponse.json({ error: error.message ?? "Failed to load mock problems." }, { status: 500 });
  }

  const problems: MockProblem[] = (data ?? []).map((problem) => ({
    id: problem.id,
    year: problem.year,
    contest: problem.contest,
    number: problem.number,
    topic: problem.topic,
    question_text: String(problem.question ?? ""),
    options: normalizeOptions(problem.options),
  }));

  const response: MockProblemListResponse = {
    problems,
    duration_sec: MOCK_DURATION_SEC,
  };

  return NextResponse.json(response, { status: 200 });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<SubmitMockRequest>;
  const userId = body.user_id ?? defaultUserId;
  const timeUsedSec = body.time_used_sec;
  const answers = body.answers;

  if (typeof timeUsedSec !== "number" || !answers || typeof answers !== "object") {
    return NextResponse.json(
      { error: "time_used_sec and answers are required." },
      { status: 400 }
    );
  }

  const problemIds = Object.keys(answers);
  if (problemIds.length === 0) {
    return NextResponse.json({ error: "No answers were submitted." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: problemRows, error: problemError } = await supabase
    .from("problems")
    .select("id, answer")
    .in("id", problemIds);

  if (problemError) {
    return NextResponse.json(
      { error: problemError.message ?? "Failed to validate mock answers." },
      { status: 500 }
    );
  }

  const answerMap = new Map(
    (problemRows ?? []).map((problem) => [problem.id, String(problem.answer ?? "").trim().toUpperCase()])
  );

  let score = 0;
  for (const [problemId, selected] of Object.entries(answers)) {
    const selectedValue = String(selected ?? "").trim().toUpperCase();
    const correctValue = answerMap.get(problemId);

    if (correctValue && selectedValue && selectedValue === correctValue) {
      score += 1;
    }
  }

  const normalizedTimeUsed = Math.max(0, Math.min(MOCK_DURATION_SEC, Math.round(timeUsedSec)));

  const { data: insertedRun, error: insertError } = await supabase
    .from("mock_runs")
    .insert({
      user_id: userId,
      score,
      time_used_sec: normalizedTimeUsed,
      created_at: new Date().toISOString(),
    })
    .select("id, created_at")
    .single();

  if (insertError || !insertedRun) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to store mock run." },
      { status: 500 }
    );
  }

  const response: SubmitMockResponse = {
    mock_run_id: insertedRun.id,
    score,
    total_questions: problemIds.length,
    time_used_sec: normalizedTimeUsed,
    submitted_at: insertedRun.created_at,
  };

  return NextResponse.json(response, { status: 201 });
}
