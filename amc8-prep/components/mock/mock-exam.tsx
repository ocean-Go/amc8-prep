"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { MockProblem, MockProblemListResponse, SubmitMockResponse } from "@/lib/types/mock";

const ANSWER_CHOICES = ["A", "B", "C", "D", "E"];
const DEFAULT_DURATION_SEC = 40 * 60;

function formatTimer(secondsLeft: number): string {
  const safe = Math.max(0, secondsLeft);
  const min = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");

  return `${min}:${sec}`;
}

export function MockExam() {
  const [problems, setProblems] = useState<MockProblem[]>([]);
  const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
  const [timeLeftSec, setTimeLeftSec] = useState(DEFAULT_DURATION_SEC);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitMockResponse | null>(null);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => Boolean(answer)).length,
    [answers]
  );

  const hasFinished = Boolean(result);

  useEffect(() => {
    async function loadMockProblems() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/mock", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to load mock exam.");
        }

        const payload = (await response.json()) as MockProblemListResponse;
        const loadedProblems = payload.problems ?? [];
        const initialAnswers = Object.fromEntries(loadedProblems.map((problem) => [problem.id, null]));

        setProblems(loadedProblems);
        setDurationSec(payload.duration_sec ?? DEFAULT_DURATION_SEC);
        setTimeLeftSec(payload.duration_sec ?? DEFAULT_DURATION_SEC);
        setAnswers(initialAnswers);
        setCurrentIndex(0);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown load error");
      } finally {
        setLoading(false);
      }
    }

    void loadMockProblems();
  }, []);

  const submitExam = useCallback(async () => {
    if (submitting || hasFinished || loading || problems.length === 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_used_sec: durationSec - timeLeftSec,
          answers,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to submit mock exam.");
      }

      const payload = (await response.json()) as SubmitMockResponse;
      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown submission error");
    } finally {
      setSubmitting(false);
    }
  }, [answers, durationSec, hasFinished, loading, problems.length, submitting, timeLeftSec]);

  useEffect(() => {
    if (loading || hasFinished || problems.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasFinished, loading, problems.length]);

  useEffect(() => {
    if (timeLeftSec === 0 && !hasFinished && !loading && problems.length > 0) {
      void submitExam();
    }
  }, [hasFinished, loading, problems.length, submitExam, timeLeftSec]);

  const currentProblem = problems[currentIndex] ?? null;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">🧪 AMC8 Mock Exam</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← Back
          </Link>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-700">Questions: {answeredCount}/{problems.length} answered</p>
            <p className={`text-xl font-bold ${timeLeftSec <= 300 ? "text-red-600" : "text-indigo-700"}`}>
              Time Left: {formatTimer(timeLeftSec)}
            </p>
          </div>
        </div>

        {loading && <div className="card text-gray-700">Loading 25 AMC8 problems...</div>}
        {!loading && error && <div className="card text-red-600">{error}</div>}

        {!loading && !error && currentProblem && (
          <>
            <div className="card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  Question {currentIndex + 1} / {problems.length}
                </span>
                <span className="text-sm text-gray-500">
                  AMC8 {currentProblem.year ?? ""}
                  {currentProblem.number ? ` • #${currentProblem.number}` : ""}
                </span>
              </div>

              <h2 className="mb-6 text-lg font-semibold text-gray-800 sm:text-xl">{currentProblem.question_text}</h2>

              <div className="space-y-3">
                {ANSWER_CHOICES.map((letter, idx) => (
                  <button
                    key={letter}
                    type="button"
                    disabled={hasFinished}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentProblem.id]: letter,
                      }))
                    }
                    className={`w-full rounded-lg border-2 p-4 text-left transition ${
                      answers[currentProblem.id] === letter
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${hasFinished ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {letter}. {currentProblem.options[idx] ?? ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="mb-3 flex flex-wrap gap-2">
                {problems.map((problem, idx) => {
                  const isAnswered = Boolean(answers[problem.id]);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={problem.id}
                      type="button"
                      disabled={hasFinished}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 w-9 rounded-md text-sm font-semibold ${
                        isCurrent
                          ? "bg-indigo-600 text-white"
                          : isAnswered
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                      } ${hasFinished ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={hasFinished || currentIndex === 0}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(problems.length - 1, prev + 1))}
                  disabled={hasFinished || currentIndex >= problems.length - 1}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>

                <button
                  type="button"
                  onClick={() => void submitExam()}
                  disabled={hasFinished || submitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Mock Exam"}
                </button>
              </div>
            </div>
          </>
        )}

        {result && (
          <div className="card border-2 border-green-400 bg-green-50">
            <h3 className="mb-2 text-xl font-bold text-green-700">Great job finishing your mock exam! 🎉</h3>
            <p className="text-green-800">Score: {result.score} / {result.total_questions}</p>
            <p className="text-green-800">Time used: {Math.floor(result.time_used_sec / 60)}m {result.time_used_sec % 60}s</p>
          </div>
        )}
      </div>
    </main>
  );
}
