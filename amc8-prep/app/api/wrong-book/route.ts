import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { WrongBookEntry } from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? defaultUserId;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("wrong_book")
    .select("id, user_id, problem_id, wrong_count, last_error_type, status, mastery_level, next_review_date, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Failed to fetch wrong-book entries." }, { status: 500 });
  }

  const entries: WrongBookEntry[] = (data ?? []).map((entry) => ({
    id: entry.id,
    user_id: entry.user_id,
    problem_id: entry.problem_id,
    wrong_count: entry.wrong_count,
    last_error_type: entry.last_error_type,
    status: entry.status,
    mastery_level: entry.mastery_level,
    next_review_date: entry.next_review_date,
    updated_at: entry.updated_at,
  }));

  return NextResponse.json({ entries }, { status: 200 });
}
