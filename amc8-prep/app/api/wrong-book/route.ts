import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

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

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? defaultUserId;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: wrongBookRows, error: wrongBookError } = await supabase
    .from("wrong_book")
    .select("id, user_id, problem_id, wrong_count, last_error_type, status, mastery_level, next_review_date, updated_at")
    .eq("user_id", userId)
    .order("next_review_date", { ascending: true, nullsFirst: false });

  if (wrongBookError) {
    return NextResponse.json(
      { error: wrongBookError.message ?? "Failed to fetch wrong-book entries." },
      { status: 500 }
    );
  }

  const problemIds = Array.from(new Set((wrongBookRows ?? []).map((entry) => entry.problem_id)));

  if (problemIds.length === 0) {
    const empty: WrongBookListResponse = { entries: [] };
    return NextResponse.json(empty, { status: 200 });
  }

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

  const entries: WrongBookReviewItem[] = (wrongBookRows ?? [])
    .map((entry) => {
      const problem = problemMap.get(entry.problem_id);
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
        problem,
      };
    })
    .filter((entry): entry is WrongBookReviewItem => entry !== null);

  const response: WrongBookListResponse = { entries };
  return NextResponse.json(response, { status: 200 });
}
