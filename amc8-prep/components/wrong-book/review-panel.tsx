"use client";

import { useEffect, useMemo, useState } from "react";

import type { CreateAttemptResponse, WrongBookListResponse, WrongBookReviewItem } from "@/lib/types/practice";

const ANSWER_CHOICES = ["A", "B", "C", "D", "E"];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function WrongBookReviewPanel() {
  const [entries, setEntries] = useState<WrongBookReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<Record<string, CreateAttemptResponse>>({});

  const reviewCount = useMemo(() => entries.length, [entries.length]);

  useEffect(() => {
    loadWrongBook();
  }, []);

  async function loadWrongBook() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wrong-book", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to load wrong-book problems.");
      }

      const payload = (await response.json()) as WrongBookListResponse;
      setEntries(payload.entries ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error while loading data.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRetry(entry: WrongBookReviewItem) {
    const selectedAnswer = selectedAnswers[entry.id];
    if (!selectedAnswer) {
      return;
    }

    setSubmittingId(entry.id);
    setError(null);

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: entry.problem_id,
          selected_answer: selectedAnswer,
          time_spent_sec: 1,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to submit retry.");
      }

      const payload = (await response.json()) as CreateAttemptResponse;
      setRetryResult((prev) => ({ ...prev, [entry.id]: payload }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown retry error.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return <div className="card text-gray-700">Loading wrong-book problems...</div>;
  }

  if (error) {
    return <div className="card text-red-600">{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="card text-center py-10">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-xl font-semibold text-gray-800">No wrong problems right now</h2>
        <p className="mt-1 text-gray-600">Keep practicing and come back for review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-white">Ready to review: {reviewCount} problem(s)</p>

      {entries.map((entry, index) => {
        const selectedAnswer = selectedAnswers[entry.id] ?? "";
        const result = retryResult[entry.id];

        return (
          <article key={entry.id} className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">#{index + 1}</span>
              <div className="flex gap-2 text-gray-500">
                <span>wrong_count: {entry.wrong_count}</span>
                <span>status: {entry.status}</span>
                <span>next review: {formatDate(entry.next_review_date)}</span>
              </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold text-gray-800">{entry.problem.question_text}</h2>

            <div className="space-y-2">
              {ANSWER_CHOICES.map((choice, idx) => {
                const optionText = entry.problem.options[idx] ?? "";
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setSelectedAnswers((prev) => ({ ...prev, [entry.id]: choice }))}
                    className={`w-full rounded-md border px-3 py-2 text-left ${
                      selectedAnswer === choice ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    {choice}. {optionText}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Correct answer: {entry.problem.correct_answer}</p>
              <button
                type="button"
                onClick={() => submitRetry(entry)}
                disabled={!selectedAnswer || submittingId === entry.id}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingId === entry.id ? "Submitting..." : "开始复盘"}
              </button>
            </div>

            {result && (
              <div
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
                  result.is_correct ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {result.is_correct ? "Great! Correct this time." : "Not correct yet. Keep reviewing."}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
