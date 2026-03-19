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

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
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

  const candidateKeys = [serviceRoleKey, anonKey].filter(isLikelyRealSupabaseKey);
  if (candidateKeys.length === 0) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = normalizeUserId(searchParams.get("user_id"));

  let wrongBookRows: WrongBookNormalizedRow[] = [];
  let lastError: string | undefined;
  let successfulKey: string | null = null;

  for (const key of candidateKeys) {
    const supabase = createSupabaseClient(key);
    const result = await fetchWrongBookRows(supabase, userId);

    if (result.rows) {
      wrongBookRows = result.rows;
      lastError = undefined;
      successfulKey = key;
      console.info("[wrong_book] Loaded wrong-book rows.", {
        userId,
        rowCount: wrongBookRows.length,
      });
      break;
    }

    lastError = result.error;
    console.error("[wrong_book] Failed to load wrong-book rows with current key.", {
      userId,
      error: result.error,
    });

    if (!result.error?.toLowerCase().includes("invalid api key")) {
      return NextResponse.json(
        { error: result.error ?? "Failed to fetch wrong-book entries." },
        { status: 500 }
      );
    }
  }

  if (lastError) {
    return NextResponse.json(
      { error: lastError ?? "Failed to fetch wrong-book entries." },
      { status: 500 }
    );
  }

  if (wrongBookRows.length === 0) {
    console.info("[wrong_book] No wrong-book rows found for user.", { userId });
    const empty: WrongBookListResponse = { entries: [] };
    return NextResponse.json(empty, { status: 200 });
  }

  const problemIds = Array.from(new Set(wrongBookRows.map((entry) => entry.problem_id)));
  const supabase = createSupabaseClient(successfulKey ?? candidateKeys[0]);
  const problemResult = await fetchProblemMap(supabase, problemIds);

  if (problemResult.error) {
    return NextResponse.json({ error: problemResult.error }, { status: 500 });
  }

  const latestAttemptResult = await fetchLatestIncorrectAttemptMap(supabase, userId, problemIds);

  if (latestAttemptResult.error) {
    return NextResponse.json({ error: latestAttemptResult.error }, { status: 500 });
  }

  const problemMap = problemResult.problemMap ?? new Map<string, ProblemRow>();
  const latestIncorrectAttemptMap = latestAttemptResult.latestIncorrectAttemptMap ?? new Map<string, string | null>();

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

  const response: WrongBookListResponse = { entries };
  return NextResponse.json(response, { status: 200 });
}
