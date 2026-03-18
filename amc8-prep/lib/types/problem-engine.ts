export type SessionMode = "practice" | "review" | "mock";

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
  options: Json;
  answer: string;
  methods: Json;
  hints: Json;
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
  wrong_count: number | null;
  last_error_type: string | null;
  status: string | null;
  mastery_level: number | null;
  next_review_date: string | null;
  updated_at: string | null;
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

type SupabaseRecord<T extends object> = T & Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Relationships: [];
        Row: SupabaseRecord<ProfileRow>;
        Insert: ({
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
        Update: ({
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
      };
      problems: {
        Relationships: [];
        Row: SupabaseRecord<ProblemRow>;
        Insert: ({
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
        } & Record<string, unknown>);
        Update: ({
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
        } & Record<string, unknown>);
      };
      sessions: {
        Relationships: [];
        Row: SupabaseRecord<SessionRow>;
        Insert: ({
          id?: string;
          user_id: string;
          mode: SessionMode;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
        Update: ({
          id?: string;
          user_id?: string;
          mode?: SessionMode;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
      };
      attempts: {
        Relationships: [];
        Row: SupabaseRecord<AttemptRow>;
        Insert: ({
          id?: string;
          user_id: string;
          problem_id: string;
          session_id?: string | null;
          selected_option?: string | null;
          is_correct: boolean;
          time_spent_seconds?: number | null;
          submitted_at?: string;
          created_at?: string;
        } & Record<string, unknown>);
        Update: ({
          id?: string;
          user_id?: string;
          problem_id?: string;
          session_id?: string | null;
          selected_option?: string | null;
          is_correct?: boolean;
          time_spent_seconds?: number | null;
          submitted_at?: string;
          created_at?: string;
        } & Record<string, unknown>);
      };
      wrong_book: {
        Relationships: [];
        Row: SupabaseRecord<WrongBookRow>;
        Insert: ({
          id?: string;
          user_id: string;
          problem_id: string;
          wrong_count?: number | null;
          last_error_type?: string | null;
          status?: string | null;
          mastery_level?: number | null;
          next_review_date?: string | null;
          updated_at?: string | null;
        } & Record<string, unknown>);
        Update: ({
          id?: string;
          user_id?: string;
          problem_id?: string;
          wrong_count?: number | null;
          last_error_type?: string | null;
          status?: string | null;
          mastery_level?: number | null;
          next_review_date?: string | null;
          updated_at?: string | null;
        } & Record<string, unknown>);
      };
      mock_runs: {
        Relationships: [];
        Row: SupabaseRecord<MockRunRow>;
        Insert: ({
          id?: string;
          user_id: string;
          session_id?: string | null;
          score?: number | null;
          total_questions?: number | null;
          duration_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
        Update: ({
          id?: string;
          user_id?: string;
          session_id?: string | null;
          score?: number | null;
          total_questions?: number | null;
          duration_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        } & Record<string, unknown>);
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
