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
    wrongBookCountResponse,
    recentAttemptsResponse,
    recentMockRunsResponse,
    latestMockResponse,
  ] = await Promise.all([
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true),
    supabase.from("wrong_book").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("attempts")
      .select("id, is_correct, submitted_at")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("mock_runs")
      .select("id, score, total_questions, completed_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("mock_runs")
      .select("score, total_questions")
      .eq("user_id", userId)
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const responsesWithErrors = [
    attemptsCountResponse,
    correctAttemptsCountResponse,
    wrongBookCountResponse,
    recentAttemptsResponse,
    recentMockRunsResponse,
    latestMockResponse,
  ];

  const failedResponse = responsesWithErrors.find((result) => result.error);
  if (failedResponse?.error) {
    return NextResponse.json(
      { error: failedResponse.error.message ?? "Failed to fetch dashboard metrics." },
      { status: 500 }
    );
  }

  const attemptsCount = attemptsCountResponse.count ?? 0;
  const correctAttemptsCount = correctAttemptsCountResponse.count ?? 0;
  const wrongBookCount = wrongBookCountResponse.count ?? 0;

  const accuracyPercent =
    attemptsCount > 0 ? Math.round((correctAttemptsCount / attemptsCount) * 1000) / 10 : 0;

  const practiceActivity: DashboardActivity[] = (recentAttemptsResponse.data ?? []).map((attempt) => ({
    id: `practice-${attempt.id}`,
    type: "practice",
    created_at: attempt.submitted_at,
    title: attempt.is_correct ? "练习答对一题" : "练习答错一题",
    detail: attempt.is_correct ? "继续保持，冲击更高正确率！" : "已记录到错题本，记得复习。",
  }));

  const mockActivity: DashboardActivity[] = (recentMockRunsResponse.data ?? []).map((mockRun) => ({
    id: `mock-${mockRun.id}`,
    type: "mock",
    created_at: mockRun.completed_at ?? mockRun.created_at,
    title: "完成一次模拟考试",
    detail:
      typeof mockRun.score === "number"
        ? `得分 ${mockRun.score}${
            typeof mockRun.total_questions === "number" ? ` / ${mockRun.total_questions}` : ""
          }`
        : "本次模拟考试暂无分数",
  }));

  const recentActivity = [...practiceActivity, ...mockActivity]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const metrics: DashboardMetrics = {
    accuracy_percent: accuracyPercent,
    attempts_count: attemptsCount,
    wrong_book_count: wrongBookCount,
    latest_mock_score: latestMockResponse.data?.score ?? null,
    latest_mock_total_questions: latestMockResponse.data?.total_questions ?? null,
    recent_activity: recentActivity,
  };

  const response: DashboardApiResponse = {
    user_id: userId,
    metrics,
  };

  return NextResponse.json(response);
}
