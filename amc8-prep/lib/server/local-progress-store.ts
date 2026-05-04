import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { CreateAttemptResponse, WrongBookReviewItem } from "@/lib/types/practice";
import type { DashboardActivity, DashboardMetrics } from "@/lib/types/dashboard";
import { findLocalProblem } from "@/lib/server/problem-source";
import { DEFAULT_APP_USER, resolveAppUserId } from "@/lib/users";

const STORE_PATH = path.resolve(process.cwd(), ".data/amc8-dev-store.json");
const DEFAULT_TEST_USER_ID = DEFAULT_APP_USER.id;

type LocalAttempt = {
  id: string;
  user_id: string;
  problem_id: string;
  selected_option: string;
  is_correct: boolean;
  time_spent_seconds: number;
  created_at: string;
};

type LocalWrongBook = {
  id: string;
  user_id: string;
  problem_id: string;
  wrong_count: number;
  last_error_type: string | null;
  status: "review_pending" | "mastered";
  mastery_level: number;
  next_review_date: string;
  updated_at: string;
  selected_wrong_answer: string | null;
};

type LocalMockRun = {
  id: string;
  user_id: string;
  score: number;
  duration_seconds: number;
  total_questions: number;
  created_at: string;
};

type LocalStore = {
  attempts: LocalAttempt[];
  wrong_book: LocalWrongBook[];
  mock_runs: LocalMockRun[];
};

function emptyStore(): LocalStore {
  return { attempts: [], wrong_book: [], mock_runs: [] };
}

function tomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

async function readStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      attempts: Array.isArray(parsed.attempts) ? (parsed.attempts as LocalAttempt[]) : [],
      wrong_book: Array.isArray(parsed.wrong_book) ? (parsed.wrong_book as LocalWrongBook[]) : [],
      mock_runs: Array.isArray(parsed.mock_runs) ? (parsed.mock_runs as LocalMockRun[]) : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: LocalStore): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function recordLocalAttempt(input: {
  userId?: string;
  problemId: string;
  selectedAnswer: string;
  timeSpentSec: number;
}): Promise<{ response?: CreateAttemptResponse; problemError?: string }> {
  const problem = await findLocalProblem(input.problemId);
  if (!problem) {
    return { problemError: "Problem not found." };
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const userId = resolveAppUserId(input.userId);
  const selected = input.selectedAnswer.trim().toUpperCase();
  const correct = problem.answer.trim().toUpperCase();
  const isCorrect = selected === correct;
  const roundedTimeSpent = Math.max(0, Math.round(input.timeSpentSec));
  const attempt: LocalAttempt = {
    id: randomUUID(),
    user_id: userId,
    problem_id: input.problemId,
    selected_option: selected,
    is_correct: isCorrect,
    time_spent_seconds: roundedTimeSpent,
    created_at: now,
  };

  store.attempts.unshift(attempt);

  const existing = store.wrong_book.find(
    (entry) => entry.user_id === userId && entry.problem_id === input.problemId
  );

  let action: CreateAttemptResponse["wrong_book_sync"] | undefined;

  if (!isCorrect) {
    if (existing) {
      existing.wrong_count += 1;
      existing.status = "review_pending";
      existing.mastery_level = 0;
      existing.next_review_date = tomorrowDate();
      existing.updated_at = now;
      existing.selected_wrong_answer = selected;
      action = {
        attempted: true,
        action: "updated",
        user_id: userId,
        problem_id: input.problemId,
        row_id: existing.id,
        attempt_id: attempt.id,
        wrong_count: existing.wrong_count,
        next_review_date: existing.next_review_date,
      };
    } else {
      const created: LocalWrongBook = {
        id: randomUUID(),
        user_id: userId,
        problem_id: input.problemId,
        wrong_count: 1,
        last_error_type: null,
        status: "review_pending",
        mastery_level: 0,
        next_review_date: tomorrowDate(),
        updated_at: now,
        selected_wrong_answer: selected,
      };
      store.wrong_book.unshift(created);
      action = {
        attempted: true,
        action: "created",
        user_id: userId,
        problem_id: input.problemId,
        row_id: created.id,
        attempt_id: attempt.id,
        wrong_count: 1,
        next_review_date: created.next_review_date,
      };
    }
  } else if (existing) {
    existing.status = "mastered";
    existing.mastery_level = Math.max(1, existing.mastery_level + 1);
    existing.updated_at = now;
    action = {
      attempted: true,
      action: "mastered",
      user_id: userId,
      problem_id: input.problemId,
      row_id: existing.id,
      attempt_id: attempt.id,
      wrong_count: existing.wrong_count,
      next_review_date: existing.next_review_date,
    };
  }

  await writeStore(store);

  return {
    response: {
      attempt_id: attempt.id,
      is_correct: isCorrect,
      time_spent_sec: roundedTimeSpent,
      user_id: userId,
      wrong_book_sync: action,
    },
  };
}

export async function listLocalWrongBook(userId: string = DEFAULT_TEST_USER_ID): Promise<WrongBookReviewItem[]> {
  const store = await readStore();
  const pending = store.wrong_book
    .filter((entry) => entry.user_id === userId && entry.status !== "mastered")
    .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date) || b.updated_at.localeCompare(a.updated_at));

  const items = await Promise.all(
    pending.map(async (entry) => {
      const problem = await findLocalProblem(entry.problem_id);
      return {
        id: entry.id,
        user_id: entry.user_id,
        problem_id: entry.problem_id,
        wrong_count: entry.wrong_count,
        last_error_type: entry.last_error_type,
        status: entry.status,
        mastery_level: entry.mastery_level,
        next_review_date: entry.next_review_date,
        updated_at: entry.updated_at,
        selected_wrong_answer: entry.selected_wrong_answer,
        problem: {
          id: problem?.id ?? entry.problem_id,
          question_text: problem?.question_text ?? "题目暂时不可用，请先根据题号复盘。",
          options: problem?.options ?? ["", "", "", "", ""],
          correct_answer: problem?.answer ?? "-",
        },
      } satisfies WrongBookReviewItem;
    })
  );

  return items;
}

export async function getLocalDashboardMetrics(userId: string = DEFAULT_TEST_USER_ID): Promise<DashboardMetrics> {
  const store = await readStore();
  const attempts = store.attempts.filter((attempt) => attempt.user_id === userId);
  const correctCount = attempts.filter((attempt) => attempt.is_correct).length;
  const wrongBookCount = store.wrong_book.filter(
    (entry) => entry.user_id === userId && entry.status !== "mastered"
  ).length;
  const latestMock = store.mock_runs
    .filter((run) => run.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const recentPracticeActivity: DashboardActivity[] = attempts.slice(0, 5).map((attempt) => ({
    id: `practice-${attempt.id}`,
    type: "practice",
    created_at: attempt.created_at,
    title: attempt.is_correct ? "练习答对一题" : "练习答错一题",
    detail: attempt.is_correct ? "这次答对了，继续加油。" : "这次答错了，记得回头复习。",
  }));
  const recentActivity = [...recentPracticeActivity]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return {
    accuracy_percent: attempts.length > 0 ? Math.round((correctCount / attempts.length) * 1000) / 10 : 0,
    attempts_count: attempts.length,
    wrong_book_count: wrongBookCount,
    latest_mock_score: latestMock?.score ?? null,
    latest_mock_total_questions: latestMock?.total_questions ?? null,
    recent_activity: recentActivity,
  };
}

export async function recordLocalMockRun(input: {
  userId?: string | null;
  score: number;
  durationSeconds: number;
  totalQuestions: number;
}): Promise<LocalMockRun> {
  const store = await readStore();
  const run: LocalMockRun = {
    id: randomUUID(),
    user_id: resolveAppUserId(input.userId),
    score: Math.max(0, Math.round(input.score)),
    duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
    total_questions: Math.max(0, Math.round(input.totalQuestions)),
    created_at: new Date().toISOString(),
  };

  store.mock_runs.unshift(run);
  await writeStore(store);
  return run;
}
