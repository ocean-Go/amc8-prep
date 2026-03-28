import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/problem-engine";
import type { WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

type ProblemRow = Pick<Database["public"]["Tables"]["problems"]["Row"], "id" | "question" | "options" | "answer">;

type WrongBookNormalizedRow = {
  id: string;
  user_id: string;
  problem_id: string;
  wrong_count: number;
  last_error_type: string | null;
  status: string;
  mastery_level: number;
  next_review_date: string;
  updated_at: string;
};

type AttemptLookupRow = Pick<
  Database["public"]["Tables"]["attempts"]["Row"],
  "problem_id" | "selected_option" | "created_at"
>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

function createSupabaseClient(key: string) {
  return createClient<Database, "public">(supabaseUrl, key);
}

function normalizeUserId(candidate: string | null) {
  const normalized = candidate?.trim();
  if (normalized && normalized !== DEFAULT_TEST_USER_ID) {
    console.warn("[wrong_book] Received non-default user_id; forcing default test user.", {
      providedUserId: normalized,
      forcedUserId: DEFAULT_TEST_USER_ID,
    });
  }
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

  if (!isLikelyRealSupabaseKey(preferredKey)) {
    return null;
  }

  return preferredKey;
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

async function fetchWrongBookRows(supabase: ReturnType<typeof createSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from("wrong_book")
    .select(
      "id, user_id, problem_id, wrong_count, last_error_type, status, mastery_level, next_review_date, updated_at"
    )
    .eq("user_id", userId)
    .order("next_review_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    return { error: error.message ?? "Failed to fetch wrong-book entries." };
  }

  return {
    rows: ((data ?? []) as WrongBookNormalizedRow[]).map((entry) => ({
      id: entry.id,
      user_id: entry.user_id,
      problem_id: entry.problem_id,
      wrong_count: Math.max(0, Number(entry.wrong_count ?? 0)),
      last_error_type: entry.last_error_type ?? null,
      status: entry.status ?? "review_pending",
      mastery_level: Math.max(0, Number(entry.mastery_level ?? 0)),
      next_review_date: entry.next_review_date ?? new Date().toISOString().slice(0, 10),
      updated_at: entry.updated_at ?? new Date(0).toISOString(),
    })),
  };
}

async function fetchProblemMap(
  supabase: ReturnType<typeof createSupabaseClient>,
  problemIds: string[]
) {
  if (problemIds.length === 0) {
    return { problemMap: new Map<string, ProblemRow>() };
  }

  const { data, error } = await supabase
    .from("problems")
    .select("id, question, options, answer")
    .in("id", problemIds);

  if (error) {
    return { error: error.message ?? "Failed to fetch wrong-book problems." };
  }

  const problemMap = new Map<string, ProblemRow>();

  for (const problem of (data ?? []) as ProblemRow[]) {
    problemMap.set(problem.id, problem);
  }

  return { problemMap };
}

async function fetchLatestIncorrectAttemptMap(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  problemIds: string[]
) {
  if (problemIds.length === 0) {
    return { latestIncorrectAttemptMap: new Map<string, string | null>() };
  }

  const { data, error } = await supabase
    .from("attempts")
    .select("problem_id, selected_option, created_at")
    .eq("user_id", userId)
    .eq("is_correct", false)
    .in("problem_id", problemIds)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message ?? "Failed to fetch wrong-book attempts." };
  }

  const latestIncorrectAttemptMap = new Map<string, string | null>();

  for (const attempt of (data ?? []) as AttemptLookupRow[]) {
    if (!latestIncorrectAttemptMap.has(attempt.problem_id)) {
      latestIncorrectAttemptMap.set(
        attempt.problem_id,
        String(attempt.selected_option ?? "").trim().toUpperCase() || null
      );
    }
  }

  return { latestIncorrectAttemptMap };
}

export async function GET(request: Request) {
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const supabaseKey = resolveSupabaseKey();
  if (!supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = normalizeUserId(searchParams.get("user_id"));
  const diagnostics: string[] = [];
  console.info("[wrong_book] Using user_id for wrong-book query.", { userId });

  const supabase = createSupabaseClient(supabaseKey);
  const result = await fetchWrongBookRows(supabase, userId);
  if (result.error) {
    console.error("[wrong_book] Failed to load wrong-book rows.", {
      userId,
      error: result.error,
    });
    return NextResponse.json(
      {
        error: result.error ?? "Failed to fetch wrong-book entries.",
        failing_step: "fetch_wrong_book_rows",
      },
      { status: 500 }
    );
  }

  const wrongBookRows = result.rows ?? [];
  console.info("[wrong_book] Loaded wrong-book rows.", {
    userId,
    rowCount: wrongBookRows.length,
  });

  if (wrongBookRows.length === 0) {
    console.info("[wrong_book] No wrong-book rows found for user.", { userId });
    const empty: WrongBookListResponse = { entries: [], raw_row_count: 0, enriched_row_count: 0 };
    return NextResponse.json(empty, { status: 200 });
  }

  const problemIds = Array.from(new Set(wrongBookRows.map((entry) => entry.problem_id)));
  const problemResult = await fetchProblemMap(supabase, problemIds);

  if (problemResult.error) {
    diagnostics.push(`fetch_problems_failed: ${problemResult.error}`);
    console.error("[wrong_book] Failed to fetch problem details for wrong-book rows.", {
      userId,
      problemIds,
      error: problemResult.error,
    });
  }

  const latestAttemptResult = await fetchLatestIncorrectAttemptMap(supabase, userId, problemIds);

  if (latestAttemptResult.error) {
    diagnostics.push(`fetch_latest_incorrect_attempts_failed: ${latestAttemptResult.error}`);
    console.error("[wrong_book] Failed to fetch latest incorrect attempts for wrong-book rows.", {
      userId,
      problemIds,
      error: latestAttemptResult.error,
    });
  }

  const problemMap = problemResult.problemMap ?? new Map<string, ProblemRow>();
  const latestIncorrectAttemptMap =
    latestAttemptResult.latestIncorrectAttemptMap ?? new Map<string, string | null>();
  const failedProblemIds = problemIds.filter((problemId) => !problemMap.has(problemId));

  if (failedProblemIds.length > 0) {
    diagnostics.push(`missing_problem_matches: ${failedProblemIds.join(",")}`);
  }

  console.info("[wrong_book] Enrichment diagnostics.", {
    userId,
    rawRowCount: wrongBookRows.length,
    problemMatchCount: problemMap.size,
    failedProblemIds,
  });

  const entries: WrongBookReviewItem[] = wrongBookRows.map((entry) => {
    const problem = problemMap.get(entry.problem_id);

    return {
      id: entry.id,
      user_id: entry.user_id,
      problem_id: entry.problem_id,
      wrong_count: entry.wrong_count,
      last_error_type: entry.last_error_type,
      status: entry.status,
      mastery_level: entry.mastery_level,
      next_review_date: entry.next_review_date,
      updated_at: entry.updated_at,
      selected_wrong_answer: latestIncorrectAttemptMap.get(entry.problem_id) ?? null,
      problem: {
        id: problem?.id ?? entry.problem_id,
        question_text: String(problem?.question ?? "题目暂时不可用，请先根据题号复盘。"),
        options: normalizeOptions(problem?.options),
        correct_answer: String(problem?.answer ?? "-").trim().toUpperCase() || "-",
      },
    };
  });

  const response: WrongBookListResponse = {
    entries,
    raw_row_count: wrongBookRows.length,
    enriched_row_count: entries.length,
    failed_problem_ids: failedProblemIds.length > 0 ? failedProblemIds : undefined,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
  console.info("[wrong_book] Returning wrong-book response.", {
    userId,
    rawRowCount: wrongBookRows.length,
    enrichedRowCount: entries.length,
    failedProblemIds,
  });
  return NextResponse.json(response, { status: 200 });
}
