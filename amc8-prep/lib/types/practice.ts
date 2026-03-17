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
