import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

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

function isMissingWrongBookColumnError(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";

  return (
    normalized.includes("wrong_book") &&
    normalized.includes("column") &&
    (normalized.includes("wrong_count") ||
      normalized.includes("last_error_type") ||
      normalized.includes("mastery_level") ||
      normalized.includes("next_review_date") ||
      normalized.includes("updated_at") ||
      normalized.includes("status"))
  );
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

function mapLegacyWrongBookEntry(entry: {
  id: string;
  user_id: string;
  problem_id: string;
  review_count: number | null;
  created_at: string | null;
}): Omit<WrongBookReviewItem, "problem"> {
  const createdAt = entry.created_at ?? new Date(0).toISOString();

  return {
    id: entry.id,
    user_id: entry.user_id,
    problem_id: entry.problem_id,
    wrong_count: Math.max(0, Number(entry.review_count ?? 0)),
    last_error_type: null,
    status: "review_pending",
    mastery_level: 0,
    next_review_date: createdAt.slice(0, 10),
    updated_at: createdAt,
  };
}

async function fetchWrongBookRows(supabase: ReturnType<typeof createClient>, userId: string) {
  const currentSchemaResult = await supabase
    .from("wrong_book")
    .select(
      "id, user_id, problem_id, wrong_count, last_error_type, status, mastery_level, next_review_date, updated_at"
    )
    .eq("user_id", userId)
    .order("next_review_date", { ascending: true, nullsFirst: false });

  if (!currentSchemaResult.error) {
    return {
      rows: (currentSchemaResult.data ?? []).map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        problem_id: entry.problem_id,
        wrong_count: Math.max(0, Number(entry.wrong_count ?? 0)),
        last_error_type: entry.last_error_type,
        status: entry.status,
        mastery_level: Math.max(0, Number(entry.mastery_level ?? 0)),
        next_review_date: entry.next_review_date,
        updated_at: entry.updated_at,
      })),
    };
  }

  if (!isMissingWrongBookColumnError(currentSchemaResult.error.message)) {
    return { error: currentSchemaResult.error.message ?? "Failed to fetch wrong-book entries." };
  }

  const legacyResult = await supabase
    .from("wrong_book")
    .select("id, user_id, problem_id, review_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (legacyResult.error) {
    return { error: legacyResult.error.message ?? "Failed to fetch wrong-book entries." };
  }

  return {
    rows: (legacyResult.data ?? []).map(mapLegacyWrongBookEntry),
  };
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

  let wrongBookRows: Array<Omit<WrongBookReviewItem, "problem">> = [];
  let lastError: string | undefined;

  for (const key of candidateKeys) {
    const supabase = createClient(supabaseUrl, key);
    const result = await fetchWrongBookRows(supabase, userId);

    if (result.rows) {
      wrongBookRows = result.rows;
      lastError = undefined;
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

  const problemIds = Array.from(new Set(wrongBookRows.map((entry) => entry.problem_id)));

  if (problemIds.length === 0) {
    const empty: WrongBookListResponse = { entries: [] };
    return NextResponse.json(empty, { status: 200 });
  }

  const supabase = createClient(supabaseUrl, candidateKeys[0]);
  const { data: problemRows, error: problemError } = await supabase
    .from("problems")
    .select("id, question, options, answer")
    .in("id", problemIds);

  if (problemError) {
    return NextResponse.json(
      { error: problemError.message ?? "Failed to fetch wrong-book problems." },
      { status: 500 }
    );
  }

  const problemMap = new Map(
    (problemRows ?? []).map((problem) => [
      problem.id,
      {
        id: problem.id,
        question_text: String(problem.question ?? ""),
        options: normalizeOptions(problem.options),
        correct_answer: String(problem.answer ?? "").trim().toUpperCase(),
      },
    ])
  );

  const entries: WrongBookReviewItem[] = wrongBookRows
    .map((entry) => {
      const problem = problemMap.get(entry.problem_id);
      if (!problem) {
        return null;
      }

      return {
        ...entry,
        problem,
      };
    })
    .filter((entry): entry is WrongBookReviewItem => entry !== null);

  const response: WrongBookListResponse = { entries };
  return NextResponse.json(response, { status: 200 });
}
