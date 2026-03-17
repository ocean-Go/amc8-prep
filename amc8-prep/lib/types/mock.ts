export interface MockProblem {
  id: string;
  year: number | null;
  contest: string | null;
  number: number | null;
  topic: string | null;
  question_text: string;
  options: string[];
}

export interface MockProblemListResponse {
  problems: MockProblem[];
  duration_sec: number;
}

export interface SubmitMockRequest {
  user_id?: string;
  time_used_sec: number;
  answers: Record<string, string | null>;
}

export interface SubmitMockResponse {
  mock_run_id: string;
  score: number;
  total_questions: number;
  time_used_sec: number;
  submitted_at: string;
}
