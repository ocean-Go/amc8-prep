import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/problem-engine";
import type { WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

type WrongBookSelectableRow = Pick<
  Database["public"]["Tables"]["wrong_book"]["Row"],
  "id" | "user_id" | "problem_id" | "wrong_count"
> &
  Partial<
    Pick<
      Database["public"]["Tables"]["wrong_book"]["Row"],
      "last_error_type" | "status" | "mastery_level" | "next_review_date" | "updated_at"
    >
  >;

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
    "last_error_type",
    "status",
    "mastery_level",
    "next_review_date",
    "updated_at",
  ];

  while (true) {
    let query = supabase.from("wrong_book").select(selectFields.join(", ")).eq("user_id", userId);

    if (selectFields.includes("next_review_date")) {
      query = query.order("next_review_date", { ascending: true, nullsFirst: false });
    } else if (selectFields.includes("updated_at")) {
      query = query.order("updated_at", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;

    if (!error) {
      const rows = ((data ?? []) as unknown) as WrongBookSelectableRow[];

      return {
        rows: rows.map((entry) => ({
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

    const missingColumn = extractMissingColumn(error.message);
    if (!isMissingColumnError(error.message) || !missingColumn || missingColumn === "wrong_count") {
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

  let wrongBookRows: Array<Omit<WrongBookReviewItem, "problem">> = [];
  let lastError: string | undefined;

  for (const key of candidateKeys) {
    const supabase = createSupabaseClient(key);
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

  const supabase = createSupabaseClient(candidateKeys[0]);
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
