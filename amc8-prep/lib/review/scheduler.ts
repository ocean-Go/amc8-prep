/** Deterministic, independent-retrieval review schedule. No client trust or I/O. */
export type ReviewStatus = "review_pending" | "mastered";
export type AttemptMode = "practice" | "review" | "mock";

export interface ReviewRecord {
  wrong_count: number;
  mastery_level: number;
  status: ReviewStatus;
  next_review_date: string;
}

export interface ReviewAttempt {
  correct: boolean;
  mode: AttemptMode;
  date: string; // YYYY-MM-DD in the learner's local calendar
  hintUsed?: boolean;
}

/** The child is currently studying in Madrid; don't use the UTC date at midnight. */
export function todayInMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function addDays(date: string, count: number): string {
  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(midnight.getTime())) throw new Error("Invalid review date");
  midnight.setUTCDate(midnight.getUTCDate() + count);
  return midnight.toISOString().slice(0, 10);
}

/**
 * Schedule: wrong -> tomorrow; due unaided review -> +3, +7, +14 days;
 * fourth due unaided success -> mastered. Early and ordinary-practice correct
 * answers cannot advance mastery. Hinted review answers reset to tomorrow.
 */
export function updateReview(previous: ReviewRecord | null, input: ReviewAttempt): ReviewRecord | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Date must be YYYY-MM-DD");

  if (!input.correct) {
    return {
      wrong_count: (previous?.wrong_count ?? 0) + 1,
      mastery_level: 0,
      status: "review_pending",
      next_review_date: addDays(input.date, 1),
    };
  }

  if (!previous || previous.status === "mastered" || input.mode !== "review") return previous;

  if (input.hintUsed) {
    return { ...previous, mastery_level: 0, status: "review_pending", next_review_date: addDays(input.date, 1) };
  }

  if (input.date < previous.next_review_date) return previous;

  const level = Math.min(4, Math.max(0, previous.mastery_level) + 1);
  const interval = [0, 3, 7, 14][level] ?? 0;
  return {
    ...previous,
    mastery_level: level,
    status: level >= 4 ? "mastered" : "review_pending",
    next_review_date: level >= 4 ? previous.next_review_date : addDays(input.date, interval),
  };
}
