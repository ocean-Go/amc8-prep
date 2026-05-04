import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { PracticeProblem } from "@/lib/types/practice";
import { loadPracticeProblems } from "@/lib/server/problem-source";

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
  const topic = request.nextUrl.searchParams.get("topic");

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      let query = supabase
        .from("problems")
        .select("id, year, contest, problem_number, topic, question, options")
        .order("year", { ascending: false, nullsFirst: false })
        .order("problem_number", { ascending: true, nullsFirst: false })
        .limit(50);

      if (topic && topic !== "all") {
        query = query.eq("topic", topic);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const problems: PracticeProblem[] = data.map((problem) => ({
          id: problem.id,
          year: problem.year,
          contest: problem.contest,
          number: problem.problem_number,
          topic: problem.topic,
          question_text: problem.question,
          options: normalizeOptions(problem.options),
        }));

        return NextResponse.json({ problems, source: "database" });
      }
    } catch {
      // Fall back to the local gradable problem set below.
    }
  }

  const local = await loadPracticeProblems(topic);
  return NextResponse.json(local);
}
