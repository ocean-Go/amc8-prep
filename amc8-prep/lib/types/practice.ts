export interface PracticeProblem {
  id: string;
  year: number | null;
  contest: string | null;
  number: number | null;
  topic: string | null;
  question_text: string;
  options: string[];
}

export interface CreateAttemptRequest {
  user_id?: string;
  problem_id: string;
  selected_answer: string;
  time_spent_sec: number;
}

export interface CreateAttemptResponse {
  attempt_id: string;
  is_correct: boolean;
  time_spent_sec: number;
}

export interface WrongBookEntry {
  id: string;
  user_id: string;
  problem_id: string;
  wrong_count: number;
  last_error_type: string | null;
  status: string;
  mastery_level: number;
  next_review_date: string;
  updated_at: string;
}

export interface WrongBookProblem {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

export interface WrongBookReviewItem extends WrongBookEntry {
  problem: WrongBookProblem;
}

export interface WrongBookListResponse {
  entries: WrongBookReviewItem[];
}
