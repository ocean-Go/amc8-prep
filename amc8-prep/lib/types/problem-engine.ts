export type SessionMode = 'practice' | 'review' | 'mock';

export interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ProblemRow {
  id: string;
  source: string | null;
  year: number | null;
  contest: string | null;
  number: number | null;
  topic: string;
  difficulty: number | null;
  question: string;
  options: unknown[];
  answer: string;
  methods: unknown[];
  hints: unknown[];
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  mode: SessionMode;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  problem_id: string;
  session_id: string | null;
  selected_option: string | null;
  is_correct: boolean;
  time_spent_seconds: number | null;
  submitted_at: string;
  created_at: string;
}

export interface WrongBookRow {
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

export interface MockRunRow {
  id: string;
  user_id: string;
  session_id: string | null;
  score: number | null;
  total_questions: number | null;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ProblemEngineSchema {
  profiles: ProfileRow;
  problems: ProblemRow;
  sessions: SessionRow;
  attempts: AttemptRow;
  wrong_book: WrongBookRow;
  mock_runs: MockRunRow;
}
