"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import type { DashboardApiResponse } from "@/lib/types/dashboard";

function getErrorMessage(payload: DashboardApiResponse | { error?: string }): string | null {
  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return null;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex justify-between items-center py-2">
          <div className="space-y-2 w-full max-w-md">
            <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-2/5 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data = (await response.json()) as DashboardApiResponse | { error?: string };

        if (!response.ok) {
          throw new Error(getErrorMessage(data) ?? "加载学习面板失败");
        }

        setDashboard(data as DashboardApiResponse);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "加载学习面板失败";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  const accuracyValue = dashboard ? `${dashboard.metrics.accuracy_percent}%` : "--";
  const attemptCountValue = dashboard ? `${dashboard.metrics.attempts_count}` : "--";
  const wrongCountValue = dashboard ? `${dashboard.metrics.wrong_book_count}` : "--";
  const latestMockValue = dashboard
    ? dashboard.metrics.latest_mock_score === null
      ? "暂无数据"
      : `${dashboard.metrics.latest_mock_score}${
          dashboard.metrics.latest_mock_total_questions
            ? ` / ${dashboard.metrics.latest_mock_total_questions}`
            : ""
        }`
    : "--";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">📊 学习面板</h1>
          <Link href="/" className="text-white hover:underline">
            ← 返回首页
          </Link>
        </div>

        {error ? (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-red-600 mb-2">加载失败</h3>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        ) : null}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="✅ 练习正确率"
            value={accuracyValue}
            hint="基于所有练习作答"
            accentClass="text-green-600"
            loading={loading}
          />
          <MetricCard
            title="🧮 作答总次数"
            value={attemptCountValue}
            hint="累计练习提交次数"
            accentClass="text-blue-600"
            loading={loading}
          />
          <MetricCard
            title="📝 错题数量"
            value={wrongCountValue}
            hint="当前错题本条目"
            accentClass="text-red-600"
            loading={loading}
          />
          <MetricCard
            title="🏁 最近模考成绩"
            value={latestMockValue}
            hint="没有模考时显示暂无数据"
            accentClass="text-purple-600"
            loading={loading}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/topics" className="block">
            <div className="card text-center hover:bg-blue-50 transition cursor-pointer">
              <div className="text-4xl mb-2">📖</div>
              <h3 className="text-xl font-semibold">知识点学习</h3>
              <p className="text-gray-500 text-sm">系统学习 AMC8 考点</p>
            </div>
          </Link>
          <Link href="/practice" className="block">
            <div className="card text-center hover:bg-green-50 transition cursor-pointer">
              <div className="text-4xl mb-2">✏️</div>
              <h3 className="text-xl font-semibold">真题练习</h3>
              <p className="text-gray-500 text-sm">历年真题强化训练</p>
            </div>
          </Link>
          <Link href="/wrong-answers" className="block">
            <div className="card text-center hover:bg-red-50 transition cursor-pointer">
              <div className="text-4xl mb-2">📕</div>
              <h3 className="text-xl font-semibold">错题本</h3>
              <p className="text-gray-500 text-sm">复习薄弱知识点</p>
            </div>
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">📋 最近 5 次练习</h3>
          {loading ? <ActivitySkeleton /> : <RecentActivity activity={dashboard?.metrics.recent_activity ?? []} />}
        </div>
      </div>
    </main>
  );
}
