import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  DashboardActivity,
  DashboardApiResponse,
  DashboardMetrics,
} from "@/lib/types/dashboard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultUserId = process.env.DEFAULT_TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";

type AttemptRow = {
  id: string;
  is_correct: boolean;
  submitted_at: string;
};

type LatestMockRow = {
  score: number | null;
  total_questions: number | null;
};

function getSafeCount(count: number | null, hasError: boolean) {
  return hasError ? 0 : (count ?? 0);
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials are not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? defaultUserId;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [
    attemptsCountResponse,
    correctAttemptsCountResponse,
    recentAttemptsResponse,
    wrongBookCountResponse,
    latestMockResponse,
  ] = await Promise.all([
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true),
    supabase
      .from("attempts")
      .select("id, is_correct, submitted_at")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase.from("wrong_book").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("mock_runs")
      .select("score, total_questions")
      .eq("user_id", userId)
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const requiredFailure = [
    attemptsCountResponse,
    correctAttemptsCountResponse,
    recentAttemptsResponse,
  ].find((result) => result.error);

  if (requiredFailure?.error) {
    return NextResponse.json(
      { error: requiredFailure.error.message ?? "Failed to fetch dashboard metrics." },
      { status: 500 }
    );
  }

  const attemptsCount = attemptsCountResponse.count ?? 0;
  const correctAttemptsCount = correctAttemptsCountResponse.count ?? 0;
  const wrongBookCount = getSafeCount(wrongBookCountResponse.count, Boolean(wrongBookCountResponse.error));
  const latestMock = latestMockResponse.error ? null : (latestMockResponse.data as LatestMockRow | null);

  const accuracyPercent =
    attemptsCount > 0 ? Math.round((correctAttemptsCount / attemptsCount) * 1000) / 10 : 0;

  const recentActivity: DashboardActivity[] = ((recentAttemptsResponse.data ?? []) as AttemptRow[]).map(
    (attempt) => ({
      id: `practice-${attempt.id}`,
      type: "practice",
      created_at: attempt.submitted_at,
      title: attempt.is_correct ? "练习答对一题" : "练习答错一题",
      detail: attempt.is_correct ? "这次答对了，继续加油。" : "这次答错了，记得回头复习。",
    })
  );

  const metrics: DashboardMetrics = {
    accuracy_percent: accuracyPercent,
    attempts_count: attemptsCount,
    wrong_book_count: wrongBookCount,
    latest_mock_score: latestMock?.score ?? null,
    latest_mock_total_questions: latestMock?.total_questions ?? null,
    recent_activity: recentActivity,
  };

  const response: DashboardApiResponse = {
    user_id: userId,
    metrics,
  };

  return NextResponse.json(response);
}
