import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PracticeProblem } from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const topic = request.nextUrl.searchParams.get("topic");

  let query = supabase
    .from("problems")
    .select("id, year, contest, number, topic, question, options")
    .order("year", { ascending: false, nullsFirst: false })
    .order("number", { ascending: true, nullsFirst: false })
    .limit(50);

  if (topic && topic !== "all") {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const problems: PracticeProblem[] = (data ?? []).map((problem) => ({
    id: problem.id,
    year: problem.year,
    contest: problem.contest,
    number: problem.number,
    topic: problem.topic,
    question_text: problem.question,
    options: normalizeOptions(problem.options),
  }));

  return NextResponse.json({ problems });
}
