import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { findLocalProblem } from "@/lib/server/problem-source";
import { recordLocalAttempt } from "@/lib/server/local-progress-store";
import { DEFAULT_APP_USER, resolveAppUserId } from "@/lib/users";
import type { Database } from "@/lib/types/problem-engine";
import type {
  CreateAttemptRequest,
  CreateAttemptResponse,
  WrongBookSyncDebugInfo,
} from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const DEFAULT_TEST_USER_ID = DEFAULT_APP_USER.id;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANSWER_PATTERN = /^[A-E]$/;

function createSupabaseClient(key: string) {
  return createClient<Database, "public">(supabaseUrl, key);
}

function resolveAttemptUserId(candidate: string | undefined | null) {
  return resolveAppUserId(candidate);
}

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

function resolveSupabaseKey() {
  const preferredKey = isLikelyRealSupabaseKey(serviceRoleKey) ? serviceRoleKey : anonKey;
  return isLikelyRealSupabaseKey(preferredKey) ? preferredKey : null;
}

function buildWrongBookTimestamps() {
  const updatedAt = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    updatedAt,
    nextReviewDate: tomorrow.toISOString().slice(0, 10),
  };
}

async function syncWrongBookForIncorrectAttempt(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  attemptId: string
): Promise<{ error?: string; debug?: WrongBookSyncDebugInfo }> {
  const { updatedAt, nextReviewDate } = buildWrongBookTimestamps();

  const { data: existingRow, error: lookupError } = await supabase
    .from("wrong_book")
    .select("id, wrong_count")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (lookupError) {
    return {
      error: lookupError.message ?? "Failed to query wrong_book.",
      debug: {
        attempted: true,
        action: "lookup_failed",
        user_id: userId,
        problem_id: problemId,
        attempt_id: attemptId,
        next_review_date: nextReviewDate,
      },
    };
  }

  if (existingRow) {
    const previousWrongCount = Math.max(0, Number(existingRow.wrong_count ?? 0));
    const wrongCount = previousWrongCount + 1;

    const { error: updateError } = await supabase
      .from("wrong_book")
      .update({
        wrong_count: wrongCount,
        status: "review_pending",
        mastery_level: 0,
        next_review_date: nextReviewDate,
        updated_at: updatedAt,
      })
      .eq("user_id", userId)
      .eq("problem_id", problemId);

    if (updateError) {
      return {
        error: updateError.message ?? "Failed to update wrong_book.",
        debug: {
          attempted: true,
          action: "update_failed",
          user_id: userId,
          problem_id: problemId,
          row_id: existingRow.id,
          attempt_id: attemptId,
          previous_wrong_count: previousWrongCount,
          wrong_count: wrongCount,
          next_review_date: nextReviewDate,
        },
      };
    }

    return {
      debug: {
        attempted: true,
        action: "updated",
        user_id: userId,
        problem_id: problemId,
        row_id: existingRow.id,
        attempt_id: attemptId,
        previous_wrong_count: previousWrongCount,
        wrong_count: wrongCount,
        next_review_date: nextReviewDate,
      },
    };
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("wrong_book")
    .insert({
      user_id: userId,
      problem_id: problemId,
      wrong_count: 1,
      last_error_type: null,
      status: "review_pending",
      mastery_level: 0,
      next_review_date: nextReviewDate,
      updated_at: updatedAt,
    })
    .select("id, wrong_count")
    .single();

  if (insertError || !insertedRow) {
    return {
      error: insertError?.message ?? "Failed to insert wrong_book.",
      debug: {
        attempted: true,
        action: "create_failed",
        user_id: userId,
        problem_id: problemId,
        attempt_id: attemptId,
        wrong_count: 1,
        next_review_date: nextReviewDate,
      },
    };
  }

  return {
    debug: {
      attempted: true,
      action: "created",
      user_id: userId,
      problem_id: problemId,
      row_id: insertedRow.id,
      attempt_id: attemptId,
      wrong_count: Number(insertedRow.wrong_count ?? 1),
      next_review_date: nextReviewDate,
    },
  };
}

async function markWrongBookMastered(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  attemptId: string
): Promise<WrongBookSyncDebugInfo | undefined> {
  const { data: existingRow } = await supabase
    .from("wrong_book")
    .select("id, wrong_count, mastery_level")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (!existingRow) {
    return undefined;
  }

  const { updatedAt } = buildWrongBookTimestamps();
  const masteryLevel = Math.max(1, Number(existingRow.mastery_level ?? 0) + 1);
  await supabase
    .from("wrong_book")
    .update({ status: "mastered", mastery_level: masteryLevel, updated_at: updatedAt })
    .eq("user_id", userId)
    .eq("problem_id", problemId);

  return {
    attempted: true,
    action: "mastered",
    user_id: userId,
    problem_id: problemId,
    row_id: existingRow.id,
    attempt_id: attemptId,
    wrong_count: Number(existingRow.wrong_count ?? 0),
  };
}

async function findProblemAndInsertAttempt(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  selectedAnswer: string,
  timeSpentSec: number
) {
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

  const normalizedSelection = selectedAnswer.trim().toUpperCase();
  const normalizedCorrectAnswer = String(problem.answer).trim().toUpperCase();
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

  let wrongBookSync: WrongBookSyncDebugInfo | undefined;

  if (!isCorrect) {
    const wrongBookResult = await syncWrongBookForIncorrectAttempt(
      supabase,
      userId,
      problemId,
      insertedAttempt.id
    );

    wrongBookSync = wrongBookResult.debug;
    if (wrongBookResult.error) {
      return { insertError: `Attempt recorded but wrong-book sync failed: ${wrongBookResult.error}` };
    }
  } else {
    wrongBookSync = await markWrongBookMastered(supabase, userId, problemId, insertedAttempt.id);
  }

  const response: CreateAttemptResponse = {
    attempt_id: insertedAttempt.id,
    is_correct: isCorrect,
    time_spent_sec: roundedTimeSpent,
    user_id: userId,
    wrong_book_sync: wrongBookSync,
  };

  return { response };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateAttemptRequest>;
  const userId = resolveAttemptUserId(body.user_id);
  const problemId = body.problem_id?.trim();
  const selectedAnswer = body.selected_answer?.trim().toUpperCase();
  const timeSpentSec = body.time_spent_sec;

  if (!problemId || !selectedAnswer || typeof timeSpentSec !== "number") {
    return NextResponse.json(
      { error: "problem_id, selected_answer, and time_spent_sec are required." },
      { status: 400 }
    );
  }

  if (!ANSWER_PATTERN.test(selectedAnswer)) {
    return NextResponse.json({ error: "selected_answer must be one of A, B, C, D, or E." }, { status: 400 });
  }

  const localProblem = await findLocalProblem(problemId);
  if (localProblem) {
    const localResult = await recordLocalAttempt({ userId, problemId, selectedAnswer, timeSpentSec });
    if (localResult.response) {
      return NextResponse.json(localResult.response, { status: 201 });
    }
    return NextResponse.json({ error: localResult.problemError ?? "Problem not found." }, { status: 404 });
  }

  const supabaseKey = resolveSupabaseKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  try {
    const supabase = createSupabaseClient(supabaseKey);
    const result = await findProblemAndInsertAttempt(
      supabase,
      userId,
      problemId,
      selectedAnswer,
      timeSpentSec
    );

    if (result.response) {
      return NextResponse.json(result.response, { status: 201 });
    }

    if (result.problemError) {
      return NextResponse.json({ error: result.problemError }, { status: 404 });
    }

    return NextResponse.json({ error: result.insertError ?? "Failed to record attempt." }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record attempt." },
      { status: 500 }
    );
  }
}
