"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CreateAttemptResponse, PracticeProblem } from "@/lib/types/practice";

const ANSWER_CHOICES = ["A", "B", "C", "D", "E"];

export default function PracticePage() {
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState("all");
  const [questionStartMs, setQuestionStartMs] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmittedCurrent, setHasSubmittedCurrent] = useState(false);
  const [submitResult, setSubmitResult] = useState<CreateAttemptResponse | null>(null);

  useEffect(() => {
    async function loadProblems() {
      setLoading(true);
      setError(null);

      try {
        const query = topicFilter === "all" ? "" : `?topic=${encodeURIComponent(topicFilter)}`;
        const response = await fetch(`/api/problems${query}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to fetch problems");
        }

        const payload = (await response.json()) as { problems: PracticeProblem[] };
        setProblems(payload.problems ?? []);
        setCurrentIndex(0);
        setSelectedOption(null);
        setSubmitResult(null);
        setHasSubmittedCurrent(false);
        setQuestionStartMs(Date.now());
      } catch (fetchError) {
        setProblems([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void loadProblems();
  }, [topicFilter]);

  const currentProblem = problems[currentIndex];

  const availableTopics = useMemo(() => {
    const uniqueTopics = new Set<string>();
    for (const problem of problems) {
      if (problem.topic) {
        uniqueTopics.add(problem.topic);
      }
    }
    return ["all", ...Array.from(uniqueTopics).sort()];
  }, [problems]);

  const goToNext = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setSubmitResult(null);
      setHasSubmittedCurrent(false);
      setQuestionStartMs(Date.now());
    }
  };

  const submitAttempt = async () => {
    if (!currentProblem || !selectedOption || hasSubmittedCurrent) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const timeSpentSec = Math.max(1, Math.round((Date.now() - questionStartMs) / 1000));

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          selected_answer: selectedOption,
          time_spent_sec: timeSpentSec,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to submit attempt");
      }

      const payload = (await response.json()) as CreateAttemptResponse;
      setSubmitResult(payload);
      setHasSubmittedCurrent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown submission error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">✏️ 真题练习</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← 返回
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4 text-white">
          <label className="flex items-center gap-2">
            <span className="text-sm">Topic:</span>
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-gray-900"
            >
              {availableTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic === "all" ? "All topics" : topic}
                </option>
              ))}
            </select>
          </label>

          {!loading && problems.length > 0 && (
            <span>
              题目 {currentIndex + 1}/{problems.length}
            </span>
          )}
        </div>

        {loading && <div className="card text-gray-700">Loading real AMC8 problems...</div>}

        {!loading && error && <div className="card text-red-600">{error}</div>}

        {!loading && !error && problems.length === 0 && (
          <div className="card text-gray-700">No problems found for the selected topic.</div>
        )}

        {!loading && !error && currentProblem && (
          <div className="card">
            <div className="flex justify-between items-center mb-4 gap-3">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                AMC8 {currentProblem.year ?? ""}
              </span>
              <span className="text-gray-500 text-sm">
                {currentProblem.topic ?? "General"}
                {currentProblem.number ? ` • #${currentProblem.number}` : ""}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-6">{currentProblem.question_text}</h2>

            <div className="space-y-3">
              {ANSWER_CHOICES.map((letter, idx) => {
                const optionText = currentProblem.options[idx] ?? "";
                const optionValue = `${letter}. ${optionText}`;

                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedOption(letter)}
                    disabled={hasSubmittedCurrent}
                    className={`w-full rounded-lg border-2 p-4 text-left transition ${
                      selectedOption === letter
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${hasSubmittedCurrent ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {optionValue}
                  </button>
                );
              })}
            </div>

            {submitResult && (
              <div
                className={`mt-4 rounded-md px-3 py-2 text-sm ${
                  submitResult.is_correct
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {submitResult.is_correct ? "Correct!" : "Not correct this time."} Time spent: {" "}
                {submitResult.time_spent_sec}s
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">
                {selectedOption ? `Selected: ${selectedOption}` : "Select one option (A-E)"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={submitAttempt}
                  disabled={!selectedOption || hasSubmittedCurrent || submitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : hasSubmittedCurrent ? "Submitted" : "Submit"}
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex >= problems.length - 1 || !hasSubmittedCurrent}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
