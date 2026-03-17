"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { PracticeProblem } from "@/lib/types/practice";

const ANSWER_CHOICES = ["A", "B", "C", "D", "E"];

export default function PracticePage() {
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState("all");

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
                    className={`w-full rounded-lg border-2 p-4 text-left transition ${
                      selectedOption === letter
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {optionValue}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedOption ? `Selected: ${selectedOption}` : "Select one option (A-E)"}
              </span>
              <button
                onClick={goToNext}
                disabled={currentIndex >= problems.length - 1}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
