import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { CreateAttemptRequest, CreateAttemptResponse } from "@/lib/types/practice";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<CreateAttemptRequest>;
  const userId = body.user_id ?? defaultUserId;
  const problemId = body.problem_id;
  const selectedAnswer = body.selected_answer;
  const timeSpentSec = body.time_spent_sec;

  if (!problemId || !selectedAnswer || typeof timeSpentSec !== "number") {
    return NextResponse.json(
      { error: "problem_id, selected_answer, and time_spent_sec are required." },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("answer")
    .eq("id", problemId)
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: problemError?.message ?? "Problem not found." }, { status: 404 });
  }

  const normalizedSelection = selectedAnswer.trim().toUpperCase();
  const normalizedCorrectAnswer = String(problem.answer).trim().toUpperCase();
  const isCorrect = normalizedSelection === normalizedCorrectAnswer;

  const { data: insertedAttempt, error: insertError } = await supabase
    .from("attempts")
    .insert({
      user_id: userId,
      problem_id: problemId,
      selected_option: normalizedSelection,
      is_correct: isCorrect,
      time_spent_seconds: Math.max(0, Math.round(timeSpentSec)),
    })
    .select("id")
    .single();

  if (insertError || !insertedAttempt) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to record attempt." }, { status: 500 });
  }

  if (!isCorrect) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { data: existingWrongBookEntry, error: wrongBookFetchError } = await supabase
      .from("wrong_book")
      .select("id, wrong_count")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .maybeSingle();

    if (wrongBookFetchError) {
      return NextResponse.json(
        { error: wrongBookFetchError.message ?? "Failed to fetch wrong-book record." },
        { status: 500 }
      );
    }

    if (!existingWrongBookEntry) {
      const { error: wrongBookInsertError } = await supabase.from("wrong_book").insert({
        user_id: userId,
        problem_id: problemId,
        wrong_count: 1,
        last_error_type: null,
        status: "review_pending",
        mastery_level: 0,
        next_review_date: tomorrow.toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (wrongBookInsertError) {
        return NextResponse.json(
          { error: wrongBookInsertError.message ?? "Failed to create wrong-book record." },
          { status: 500 }
        );
      }
    } else {
      const { error: wrongBookUpdateError } = await supabase
        .from("wrong_book")
        .update({
          wrong_count: existingWrongBookEntry.wrong_count + 1,
          status: "review_pending",
          next_review_date: tomorrow.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWrongBookEntry.id);

      if (wrongBookUpdateError) {
        return NextResponse.json(
          { error: wrongBookUpdateError.message ?? "Failed to update wrong-book record." },
          { status: 500 }
        );
      }
    }
  }

  const response: CreateAttemptResponse = {
    attempt_id: insertedAttempt.id,
    is_correct: isCorrect,
    time_spent_sec: Math.max(0, Math.round(timeSpentSec)),
  };

  return NextResponse.json(response, { status: 201 });
}
