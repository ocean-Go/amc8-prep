import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { CreateAttemptRequest, CreateAttemptResponse } from "@/lib/types/practice";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOCK_PROBLEM_CORRECT_ANSWERS: Record<string, string> = {
  "mock-2023-1": "C",
  "mock-2022-5": "C",
  "mock-2021-9": "C",
};

function isLikelyRealSupabaseKey(key: string): boolean {
  const normalized = key.trim();
  if (!normalized) {
    return false;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("your_") || lower.includes("placeholder") || lower.includes("changeme")) {
    return false;
  }

  return true;
}

async function findProblemAndInsertAttempt(
  preferredKey: string,
  userId: string,
  problemId: string,
  selectedAnswer: string,
  timeSpentSec: number
) {
  const supabase = createClient(supabaseUrl, preferredKey);

  const mockCorrectAnswer = MOCK_PROBLEM_CORRECT_ANSWERS[problemId];

  let correctAnswer: string | null = mockCorrectAnswer ?? null;

  if (!correctAnswer) {
    if (!UUID_PATTERN.test(problemId)) {
      return { problemError: "Problem not found." };
    }

    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("answer")
      .eq("id", problemId)
      .single();

    if (problemError || !problem) {
      return { problemError: problemError?.message ?? "Problem not found." };
    }

    correctAnswer = String(problem.answer);
  }

  const normalizedSelection = selectedAnswer.trim().toUpperCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toUpperCase();
  const isCorrect = normalizedSelection === normalizedCorrectAnswer;
  const roundedTimeSpent = Math.max(0, Math.round(timeSpentSec));

  const { data: insertedAttempt, error: insertError } = await supabase
    .from("attempts")
    .insert({
      user_id: userId,
      problem_id: problemId,
      selected_option: normalizedSelection,
      is_correct: isCorrect,
      time_spent_seconds: roundedTimeSpent,
    })
    .select("id")
    .single();

  if (insertError || !insertedAttempt) {
    return { insertError: insertError?.message ?? "Failed to record attempt." };
  }

  const response: CreateAttemptResponse = {
    attempt_id: insertedAttempt.id,
    is_correct: isCorrect,
    time_spent_sec: roundedTimeSpent,
  };

  return { response };
}

export async function POST(request: Request) {
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const candidateKeys = [serviceRoleKey, anonKey].filter(isLikelyRealSupabaseKey);
  if (candidateKeys.length === 0) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<CreateAttemptRequest>;
  const userId = body.user_id ?? defaultUserId;
  const problemId = body.problem_id;
  const selectedAnswer = body.selected_answer;
  const timeSpentSec = body.time_spent_sec;

  if (!problemId || !selectedAnswer || typeof timeSpentSec !== "number") {
    return NextResponse.json(
      { error: "problem_id, selected_answer, and time_spent_sec are required." },
      { status: 400 }
    );
  }

  let lastProblemError: string | undefined;
  let lastInsertError: string | undefined;

  for (const key of candidateKeys) {
    const result = await findProblemAndInsertAttempt(key, userId, problemId, selectedAnswer, timeSpentSec);

    if (result.response) {
      return NextResponse.json(result.response, { status: 201 });
    }

    if (result.problemError) {
      lastProblemError = result.problemError;

      if (!result.problemError.toLowerCase().includes("invalid api key")) {
        return NextResponse.json({ error: result.problemError }, { status: 404 });
      }
    }

    if (result.insertError) {
      lastInsertError = result.insertError;

      if (!result.insertError.toLowerCase().includes("invalid api key")) {
        return NextResponse.json({ error: result.insertError }, { status: 500 });
      }
    }
  }

  return NextResponse.json(
    { error: lastInsertError ?? lastProblemError ?? "Failed to record attempt." },
    { status: 500 }
  );
}
