import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { loadLocalProblemsWithAnswers } from "@/lib/server/problem-source";
import { recordLocalMockRun } from "@/lib/server/local-progress-store";
import { DEFAULT_APP_USER, resolveAppUserId } from "@/lib/users";
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
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? DEFAULT_APP_USER.id;

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

async function getLocalMockProblems(): Promise<MockProblemListResponse> {
  const localProblems = await loadLocalProblemsWithAnswers();
  return {
    problems: localProblems.slice(0, MOCK_QUESTION_COUNT).map(({ answer: _answer, explanation: _explanation, source: _source, ...problem }) => problem),
    duration_sec: MOCK_DURATION_SEC,
  };
}

export async function GET() {
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from("problems")
        .select("id, year, contest, problem_number, topic, question, options")
        .order("year", { ascending: false, nullsFirst: false })
        .order("problem_number", { ascending: true, nullsFirst: false })
        .limit(MOCK_QUESTION_COUNT);

      if (!error && data && data.length > 0) {
        const problems: MockProblem[] = data.map((problem) => ({
          id: problem.id,
          year: problem.year,
          contest: problem.contest,
          number: problem.problem_number,
          topic: problem.topic,
          question_text: String(problem.question ?? ""),
          options: normalizeOptions(problem.options),
        }));

        return NextResponse.json({ problems, duration_sec: MOCK_DURATION_SEC } satisfies MockProblemListResponse, {
          status: 200,
        });
      }
    } catch {
      // Fall through to local gradable mock exam.
    }
  }

  return NextResponse.json(await getLocalMockProblems(), { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SubmitMockRequest>;
  const userId = resolveAppUserId(body.user_id ?? defaultUserId);
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

  const normalizedTimeUsed = Math.max(0, Math.min(MOCK_DURATION_SEC, Math.round(timeUsedSec)));

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: problemRows, error: problemError } = await supabase
        .from("problems")
        .select("id, answer")
        .in("id", problemIds);

      if (!problemError && problemRows && problemRows.length > 0) {
        const answerMap = new Map(
          problemRows.map((problem) => [problem.id, String(problem.answer ?? "").trim().toUpperCase()])
        );

        let score = 0;
        for (const [problemId, selected] of Object.entries(answers)) {
          const selectedValue = String(selected ?? "").trim().toUpperCase();
          const correctValue = answerMap.get(problemId);

          if (correctValue && selectedValue && selectedValue === correctValue) {
            score += 1;
          }
        }

        const { data: insertedRun, error: insertError } = await supabase
          .from("mock_runs")
          .insert({
            user_id: userId,
            score,
            duration_seconds: normalizedTimeUsed,
            total_questions: problemIds.length,
            created_at: new Date().toISOString(),
          })
          .select("id, created_at")
          .single();

        if (!insertError && insertedRun) {
          const response: SubmitMockResponse = {
            mock_run_id: insertedRun.id,
            score,
            total_questions: problemIds.length,
            time_used_sec: normalizedTimeUsed,
            submitted_at: insertedRun.created_at,
          };

          return NextResponse.json(response, { status: 201 });
        }
      }
    } catch {
      // Fall through to local scoring.
    }
  }

  const localProblems = await loadLocalProblemsWithAnswers();
  const localAnswerMap = new Map(localProblems.map((problem) => [problem.id, problem.answer]));
  let localScore = 0;

  for (const [problemId, selected] of Object.entries(answers)) {
    const selectedValue = String(selected ?? "").trim().toUpperCase();
    const correctValue = localAnswerMap.get(problemId);
    if (correctValue && selectedValue === correctValue) {
      localScore += 1;
    }
  }

  const localRun = await recordLocalMockRun({
    userId,
    score: localScore,
    durationSeconds: normalizedTimeUsed,
    totalQuestions: problemIds.length,
  });

  const response: SubmitMockResponse = {
    mock_run_id: localRun.id,
    score: localRun.score,
    total_questions: localRun.total_questions,
    time_used_sec: localRun.duration_seconds,
    submitted_at: localRun.created_at,
  };

  return NextResponse.json(response, { status: 201 });
}
