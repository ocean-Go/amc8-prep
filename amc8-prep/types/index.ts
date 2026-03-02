export interface User {
  id: string;
  name: string;
  age: number;
  avatar?: string;
  created_at: string;
}

export interface Progress {
  id: number;
  user_id: string;
  topic: string;
  completed: boolean;
  score: number;
  updated_at: string;
}

export interface WrongAnswer {
  id: number;
  user_id: string;
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  error_type: string;
  times_wrong: number;
  created_at: string;
}

export interface Topic {
  id: string;
  name: string;
  nameCN: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}
