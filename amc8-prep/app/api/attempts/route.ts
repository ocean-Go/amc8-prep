import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
const DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const SECONDARY_TEST_USER_ID = "00000000-0000-0000-0000-000000000002";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOCK_PROBLEM_CORRECT_ANSWERS: Record<string, string> = {
  "mock-2023-1": "C",
  "mock-2022-5": "C",
  "mock-2021-9": "C",
};

function createSupabaseClient(key: string) {
  return createClient<Database, "public">(supabaseUrl, key);
}

function resolveAttemptUserId(candidate: string | undefined | null) {
  const normalized = candidate?.trim();
  if (!normalized) {
    return DEFAULT_TEST_USER_ID;
  }

  if (normalized.toLowerCase() === "matt") {
    return DEFAULT_TEST_USER_ID;
  }

  if (normalized.toLowerCase() === "chris") {
    return SECONDARY_TEST_USER_ID;
  }

  if (UUID_PATTERN.test(normalized)) {
    return normalized;
  }

  console.warn("[attempts] Unsupported user_id format; falling back to default test user.", {
    providedUserId: normalized,
    fallbackUserId: DEFAULT_TEST_USER_ID,
  });
  return DEFAULT_TEST_USER_ID;
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

  console.info("[wrong_book] Entering wrong-book sync.", {
    attemptId,
    userId,
    problemId,
    updatedAt,
    nextReviewDate,
  });

  const { data: existingRow, error: lookupError } = await supabase
    .from("wrong_book")
    .select("id, wrong_count")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (lookupError) {
    console.error("[wrong_book] Lookup failed.", {
      attemptId,
      userId,
      problemId,
      error: lookupError.message,
    });

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

    console.info("[wrong_book] Update path selected.", {
      attemptId,
      rowId: existingRow.id,
      userId,
      problemId,
      previousWrongCount,
      wrongCount,
    });

    const { error: updateError } = await supabase
      .from("wrong_book")
      .update({
        wrong_count: wrongCount,
        next_review_date: nextReviewDate,
        updated_at: updatedAt,
      })
      .eq("user_id", userId)
      .eq("problem_id", problemId);

    if (updateError) {
      console.error("[wrong_book] Update failed.", {
        attemptId,
        rowId: existingRow.id,
        userId,
        problemId,
        error: updateError.message,
      });

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

  console.info("[wrong_book] Create path selected.", {
    attemptId,
    userId,
    problemId,
  });

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
    console.error("[wrong_book] Insert failed.", {
      attemptId,
      userId,
      problemId,
      error: insertError?.message ?? "No row returned after insert.",
    });

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

async function syncWrongBookForCorrectAttempt(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  attemptId: string
): Promise<{ error?: string; debug?: WrongBookSyncDebugInfo }> {
  const { data: existingRow, error: lookupError } = await supabase
    .from("wrong_book")
    .select("id")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (lookupError) {
    return {
      error: lookupError.message ?? "Failed to query wrong_book for correct attempt sync.",
      debug: {
        attempted: true,
        action: "remove_failed",
        user_id: userId,
        problem_id: problemId,
        attempt_id: attemptId,
      },
    };
  }

  if (!existingRow) {
    return {
      debug: {
        attempted: true,
        action: "removed",
        user_id: userId,
        problem_id: problemId,
        attempt_id: attemptId,
      },
    };
  }

  const { error: deleteError } = await supabase
    .from("wrong_book")
    .delete()
    .eq("user_id", userId)
    .eq("problem_id", problemId);

  if (deleteError) {
    return {
      error: deleteError.message ?? "Failed to remove wrong_book row after correct attempt.",
      debug: {
        attempted: true,
        action: "remove_failed",
        user_id: userId,
        problem_id: problemId,
        row_id: existingRow.id,
        attempt_id: attemptId,
      },
    };
  }

  return {
    debug: {
      attempted: true,
      action: "removed",
      user_id: userId,
      problem_id: problemId,
      row_id: existingRow.id,
      attempt_id: attemptId,
    },
  };
}

async function findProblemAndInsertAttempt(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  selectedAnswer: string,
  timeSpentSec: number
) {
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

  let wrongBookSync: WrongBookSyncDebugInfo | undefined;

  const wrongBookResult = isCorrect
    ? await syncWrongBookForCorrectAttempt(supabase, userId, problemId, insertedAttempt.id)
    : await syncWrongBookForIncorrectAttempt(supabase, userId, problemId, insertedAttempt.id);

  wrongBookSync = wrongBookResult.debug;

  if (wrongBookResult.error) {
    console.error("[wrong_book] Sync failed after attempt insert.", {
      userId,
      problemId,
      attemptId: insertedAttempt.id,
      error: wrongBookResult.error,
      debug: wrongBookResult.debug,
    });

    return {
      insertError: `Attempt recorded but wrong-book sync failed: ${wrongBookResult.error}`,
    };
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
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const supabaseKey = resolveSupabaseKey();
  if (!supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<CreateAttemptRequest>;
  const userId = resolveAttemptUserId(body.user_id);
  const problemId = body.problem_id;
  const selectedAnswer = body.selected_answer;
  const timeSpentSec = body.time_spent_sec;

  if (!problemId || !selectedAnswer || typeof timeSpentSec !== "number") {
    return NextResponse.json(
      { error: "problem_id, selected_answer, and time_spent_sec are required." },
      { status: 400 }
    );
  }

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
}
