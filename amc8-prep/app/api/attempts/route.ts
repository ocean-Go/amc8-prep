import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/problem-engine";
import type {
  CreateAttemptRequest,
  CreateAttemptResponse,
  WrongBookSyncDebugInfo,
} from "@/lib/types/practice";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
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

function normalizeUserId(candidate: string | undefined | null) {
  const normalized = candidate?.trim();
  return normalized ? normalized : DEFAULT_TEST_USER_ID;
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

function buildWrongBookDefaults() {
  const updatedAt = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    updatedAt,
    nextReviewDate: tomorrow.toISOString().slice(0, 10),
  };
}

async function updateWrongBookEntry(
  supabase: ReturnType<typeof createSupabaseClient>,
  id: string,
  payload: Database["public"]["Tables"]["wrong_book"]["Update"]
) {
  const { error } = await supabase.from("wrong_book").update(payload).eq("id", id);

  if (error) {
    return { error: error.message ?? "Failed to update wrong-book entry." };
  }

  return {};
}

async function insertWrongBookEntry(
  supabase: ReturnType<typeof createSupabaseClient>,
  payload: Database["public"]["Tables"]["wrong_book"]["Insert"]
) {
  const { data, error } = await supabase
    .from("wrong_book")
    .insert(payload)
    .select("id, wrong_count")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create wrong-book entry." };
  }

  return { data };
}

async function syncWrongBookWithCurrentSchema(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemId: string,
  updatedAt: string,
  nextReviewDate: string,
  attemptId: string
): Promise<{ error?: string; debug?: WrongBookSyncDebugInfo }> {
  console.info("[wrong_book] Entering wrong-book sync.", {
    attemptId,
    userId,
    problemId,
    updatedAt,
    nextReviewDate,
  });

  const { data: existingEntries, error: existingEntryError } = await supabase
    .from("wrong_book")
    .select("id, wrong_count")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .limit(2);

  if (existingEntryError) {
    console.error("[wrong_book] Failed to query existing row before sync.", {
      attemptId,
      userId,
      problemId,
      error: existingEntryError.message,
    });

    return {
      error: existingEntryError.message ?? "Failed to query wrong-book entry.",
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

  const existingEntry = existingEntries?.[0];
  const matchedRowIds = existingEntries?.map((entry) => entry.id) ?? [];

  console.info("[wrong_book] Existing row lookup complete.", {
    attemptId,
    userId,
    problemId,
    matchCount: existingEntries?.length ?? 0,
    matchedRowIds,
  });

  if ((existingEntries?.length ?? 0) > 1) {
    console.warn("[wrong_book] Multiple rows matched the same user/problem pair; updating the first row.", {
      attemptId,
      userId,
      problemId,
      matchedRowIds,
    });
  }

  if (existingEntry) {
    const previousWrongCount = Math.max(0, Number(existingEntry.wrong_count ?? 0));
    const nextWrongCount = previousWrongCount + 1;
    const updatePayload: Database["public"]["Tables"]["wrong_book"]["Update"] = {
      wrong_count: nextWrongCount,
      last_error_type: null,
      status: "review_pending",
      mastery_level: 0,
      next_review_date: nextReviewDate,
      updated_at: updatedAt,
    };

    console.info("[wrong_book] Update path selected.", {
      attemptId,
      rowId: existingEntry.id,
      userId,
      problemId,
      previousWrongCount,
      nextWrongCount,
      payload: updatePayload,
    });

    const updateResult = await updateWrongBookEntry(supabase, existingEntry.id, updatePayload);

    if (updateResult.error) {
      console.error("[wrong_book] Failed to update wrong-book row.", {
        attemptId,
        rowId: existingEntry.id,
        userId,
        problemId,
        previousWrongCount,
        nextWrongCount,
        error: updateResult.error,
      });

      return {
        error: updateResult.error,
        debug: {
          attempted: true,
          action: "update_failed",
          user_id: userId,
          problem_id: problemId,
          row_id: existingEntry.id,
          attempt_id: attemptId,
          previous_wrong_count: previousWrongCount,
          wrong_count: nextWrongCount,
          next_review_date: nextReviewDate,
        },
      };
    }

    console.info("[wrong_book] Updated existing wrong-book row.", {
      attemptId,
      rowId: existingEntry.id,
      userId,
      problemId,
      previousWrongCount,
      nextWrongCount,
      nextReviewDate,
    });

    return {
      debug: {
        attempted: true,
        action: "updated",
        user_id: userId,
        problem_id: problemId,
        row_id: existingEntry.id,
        attempt_id: attemptId,
        previous_wrong_count: previousWrongCount,
        wrong_count: nextWrongCount,
        next_review_date: nextReviewDate,
      },
    };
  }

  const insertPayload: Database["public"]["Tables"]["wrong_book"]["Insert"] = {
    user_id: userId,
    problem_id: problemId,
    wrong_count: 1,
    last_error_type: null,
    status: "review_pending",
    mastery_level: 0,
    next_review_date: nextReviewDate,
    updated_at: updatedAt,
  };

  console.info("[wrong_book] Create path selected.", {
    attemptId,
    userId,
    problemId,
    payload: insertPayload,
  });

  const insertResult = await insertWrongBookEntry(supabase, insertPayload);

  if (insertResult.error) {
    console.error("[wrong_book] Failed to create wrong-book row.", {
      attemptId,
      userId,
      problemId,
      payload: insertPayload,
      error: insertResult.error,
    });

    return {
      error: insertResult.error,
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

  const insertedWrongBookRow = insertResult.data;

  if (!insertedWrongBookRow) {
    return {
      error: "Failed to create wrong-book entry.",
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

  console.info("[wrong_book] Created new wrong-book row.", {
    attemptId,
    rowId: insertedWrongBookRow.id,
    userId,
    problemId,
    wrongCount: Number(insertedWrongBookRow.wrong_count ?? 1),
    nextReviewDate,
  });

  return {
    debug: {
      attempted: true,
      action: "created",
      user_id: userId,
      problem_id: problemId,
      row_id: insertedWrongBookRow.id,
      attempt_id: attemptId,
      wrong_count: Number(insertedWrongBookRow.wrong_count ?? 1),
      next_review_date: nextReviewDate,
    },
  };
}

function createWrongBookWriteClient(preferredKey: string) {
  const wrongBookKey = isLikelyRealSupabaseKey(serviceRoleKey) ? serviceRoleKey : preferredKey;
  return createSupabaseClient(wrongBookKey);
}

async function syncWrongBookForIncorrectAttempt(
  preferredKey: string,
  userId: string,
  problemId: string,
  attemptId: string
) {
  const supabase = createWrongBookWriteClient(preferredKey);
  const { updatedAt, nextReviewDate } = buildWrongBookDefaults();

  return syncWrongBookWithCurrentSchema(
    supabase,
    userId,
    problemId,
    updatedAt,
    nextReviewDate,
    attemptId
  );
}

async function findProblemAndInsertAttempt(
  preferredKey: string,
  userId: string,
  problemId: string,
  selectedAnswer: string,
  timeSpentSec: number
) {
  const supabase = createSupabaseClient(preferredKey);

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

  if (!isCorrect) {
    const wrongBookResult = await syncWrongBookForIncorrectAttempt(
      preferredKey,
      userId,
      problemId,
      insertedAttempt.id
    );

    wrongBookSync = wrongBookResult.debug;

    if (wrongBookResult.error) {
      console.error("Failed to sync wrong_book after incorrect attempt.", {
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

  const candidateKeys = [serviceRoleKey, anonKey].filter(isLikelyRealSupabaseKey);
  if (candidateKeys.length === 0) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<CreateAttemptRequest>;
  const userId = normalizeUserId(body.user_id);
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
