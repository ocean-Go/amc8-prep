export type DashboardActivityType = "practice" | "mock";

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  created_at: string;
  title: string;
  detail: string;
}

export interface DashboardMetrics {
  accuracy_percent: number;
  attempts_count: number;
  wrong_book_count: number;
  latest_mock_score: number | null;
  latest_mock_total_questions: number | null;
  recent_activity: DashboardActivity[];
}

export interface DashboardApiResponse {
  user_id: string;
  metrics: DashboardMetrics;
}
