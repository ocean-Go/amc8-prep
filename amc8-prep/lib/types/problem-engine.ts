export type SessionMode = 'practice' | 'review' | 'mock';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

type DbRecord<T extends object> = T & Record<string, unknown>;

interface TableDefinition<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<
        DbRecord<ProfileRow>,
        DbRecord<{
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }>,
        DbRecord<{
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }>
      >;
      problems: TableDefinition<
        DbRecord<ProblemRow>,
        DbRecord<{
          id?: string;
          source?: string | null;
          year?: number | null;
          contest?: string | null;
          number?: number | null;
          topic: string;
          difficulty?: number | null;
          question: string;
          options?: Json;
          answer: string;
          methods?: Json;
          hints?: Json;
          created_at?: string;
        }>,
        DbRecord<{
          id?: string;
          source?: string | null;
          year?: number | null;
          contest?: string | null;
          number?: number | null;
          topic?: string;
          difficulty?: number | null;
          question?: string;
          options?: Json;
          answer?: string;
          methods?: Json;
          hints?: Json;
          created_at?: string;
        }>
      >;
      sessions: TableDefinition<
        DbRecord<SessionRow>,
        DbRecord<{
          id?: string;
          user_id: string;
          mode: SessionMode;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        }>,
        DbRecord<{
          id?: string;
          user_id?: string;
          mode?: SessionMode;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        }>
      >;
      attempts: TableDefinition<
        DbRecord<AttemptRow>,
        DbRecord<{
          id?: string;
          user_id: string;
          problem_id: string;
          session_id?: string | null;
          selected_option?: string | null;
          is_correct: boolean;
          time_spent_seconds?: number | null;
          submitted_at?: string;
          created_at?: string;
        }>,
        DbRecord<{
          id?: string;
          user_id?: string;
          problem_id?: string;
          session_id?: string | null;
          selected_option?: string | null;
          is_correct?: boolean;
          time_spent_seconds?: number | null;
          submitted_at?: string;
          created_at?: string;
        }>
      >;
      wrong_book: TableDefinition<
        DbRecord<WrongBookRow & {
          last_attempt_id: string | null;
          notes: string | null;
          review_count: number | null;
          created_at: string | null;
        }>,
        DbRecord<{
          id?: string;
          user_id: string;
          problem_id: string;
          wrong_count?: number;
          last_error_type?: string | null;
          status?: string;
          mastery_level?: number;
          next_review_date?: string;
          updated_at?: string;
          last_attempt_id?: string | null;
          notes?: string | null;
          review_count?: number | null;
          created_at?: string | null;
        }>,
        DbRecord<{
          id?: string;
          user_id?: string;
          problem_id?: string;
          wrong_count?: number;
          last_error_type?: string | null;
          status?: string;
          mastery_level?: number;
          next_review_date?: string;
          updated_at?: string;
          last_attempt_id?: string | null;
          notes?: string | null;
          review_count?: number | null;
          created_at?: string | null;
        }>
      >;
      mock_runs: TableDefinition<
        DbRecord<MockRunRow>,
        DbRecord<{
          id?: string;
          user_id: string;
          session_id?: string | null;
          score?: number | null;
          total_questions?: number | null;
          duration_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        }>,
        DbRecord<{
          id?: string;
          user_id?: string;
          session_id?: string | null;
          score?: number | null;
          total_questions?: number | null;
          duration_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
