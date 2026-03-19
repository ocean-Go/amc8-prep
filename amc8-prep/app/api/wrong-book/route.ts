import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/problem-engine";
import type { WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

type ProblemJoinRow = Pick<Database["public"]["Tables"]["problems"]["Row"], "id" | "question" | "options" | "answer">;

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
  last_attempt_id: string | null;
  problem: ProblemJoinRow | null;
};

type WrongBookSelectableRow = Pick<Database["public"]["Tables"]["wrong_book"]["Row"], "id" | "user_id" | "problem_id"> &
  Partial<
    Pick<
      Database["public"]["Tables"]["wrong_book"]["Row"],
      | "wrong_count"
      | "last_error_type"
      | "status"
      | "mastery_level"
      | "next_review_date"
      | "updated_at"
      | "created_at"
      | "review_count"
      | "last_attempt_id"
    >
  > & {
    problems?: ProblemJoinRow | ProblemJoinRow[] | null;
  };

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

function createSupabaseClient(key: string) {
  return createClient<Database, "public">(supabaseUrl, key);
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

function isMissingColumnError(message: string | undefined) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the") ||
    (normalized.includes("column") && normalized.includes("does not exist"))
  );
}

function extractMissingColumn(message: string | undefined) {
  if (!message) {
    return null;
  }

  const schemaCacheMatch = message.match(/'([^']+)' column of 'wrong_book'/i);
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  const postgresMatch = message.match(/column\s+(?:wrong_book\.)?([a-zA-Z0-9_]+)\s+does not exist/i);
  if (postgresMatch?.[1]) {
    return postgresMatch[1];
  }

  return null;
}

async function fetchWrongBookRows(supabase: ReturnType<typeof createSupabaseClient>, userId: string) {
  const selectFields = [
    "id",
    "user_id",
    "problem_id",
    "wrong_count",
    "review_count",
    "last_error_type",
    "status",
    "mastery_level",
    "next_review_date",
    "updated_at",
    "created_at",
    "last_attempt_id",
  ];
  const problemSelect = "problems!inner(id, question, options, answer)";

  while (true) {
    let query = supabase
      .from("wrong_book")
      .select(`${selectFields.join(", ")}, ${problemSelect}`)
      .eq("user_id", userId);

    if (selectFields.includes("next_review_date")) {
      query = query.order("next_review_date", { ascending: true, nullsFirst: false });
    } else if (selectFields.includes("updated_at")) {
      query = query.order("updated_at", { ascending: false, nullsFirst: false });
    } else if (selectFields.includes("created_at")) {
      query = query.order("created_at", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;

    if (!error) {
      const rows = ((data ?? []) as unknown) as WrongBookSelectableRow[];

      return {
        rows: rows.map((entry) => ({
          id: entry.id,
          user_id: entry.user_id,
          problem_id: entry.problem_id,
          wrong_count: Math.max(0, Number(entry.wrong_count ?? entry.review_count ?? 0)),
          last_error_type: entry.last_error_type ?? null,
          status: entry.status ?? "review_pending",
          mastery_level: Math.max(0, Number(entry.mastery_level ?? 0)),
          next_review_date: String(
            entry.next_review_date ??
              entry.created_at ??
              entry.updated_at ??
              new Date().toISOString().slice(0, 10)
          ),
          updated_at: String(entry.updated_at ?? entry.created_at ?? new Date(0).toISOString()),
          last_attempt_id: entry.last_attempt_id ? String(entry.last_attempt_id) : null,
          problem: Array.isArray(entry.problems) ? entry.problems[0] ?? null : entry.problems ?? null,
        })),
      };
    }

    const missingColumn = extractMissingColumn(error.message);
    if (!isMissingColumnError(error.message) || !missingColumn) {
      return { error: error.message ?? "Failed to fetch wrong-book entries." };
    }

    const index = selectFields.indexOf(missingColumn);
    if (index === -1) {
      return { error: error.message ?? "Failed to fetch wrong-book entries." };
    }

    selectFields.splice(index, 1);
  }
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
  const userId = searchParams.get("user_id") ?? defaultUserId;

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
      break;
    }

    lastError = result.error;

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
    const empty: WrongBookListResponse = { entries: [] };
    return NextResponse.json(empty, { status: 200 });
  }

  const problemIds = Array.from(new Set(wrongBookRows.map((entry) => entry.problem_id)));
  const attemptIds = Array.from(
    new Set(
      wrongBookRows
        .map((entry) => entry.last_attempt_id)
        .filter((attemptId): attemptId is string => Boolean(attemptId))
    )
  );
  const supabase = createSupabaseClient(successfulKey ?? candidateKeys[0]);
  const { data: latestAttempts, error: attemptsError } =
    attemptIds.length > 0
      ? await supabase
          .from("attempts")
          .select("id, problem_id, selected_option, is_correct, created_at")
          .in("id", attemptIds)
      : { data: [], error: null };

  if (attemptsError) {
    return NextResponse.json(
      { error: attemptsError.message ?? "Failed to fetch wrong-book attempts." },
      { status: 500 }
    );
  }
  const latestIncorrectAttemptMap = new Map(
    (latestAttempts ?? [])
      .filter((attempt) => attempt && !attempt.is_correct)
      .map((attempt) => [attempt.id, String(attempt.selected_option ?? "").trim().toUpperCase() || null])
  );

  const entries: WrongBookReviewItem[] = wrongBookRows
    .map((entry) => {
      const problem = entry.problem;
      if (!problem) {
        return null;
      }

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
        selected_wrong_answer: latestIncorrectAttemptMap.get(entry.last_attempt_id ?? "") ?? null,
        problem: {
          id: problem.id,
          question_text: String(problem.question ?? ""),
          options: normalizeOptions(problem.options),
          correct_answer: String(problem.answer ?? "").trim().toUpperCase(),
        },
      };
    })
    .filter((entry): entry is WrongBookReviewItem => entry !== null);

  const response: WrongBookListResponse = { entries };
  return NextResponse.json(response, { status: 200 });
}
