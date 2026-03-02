// Local SQLite-like storage using localStorage in browser
// This is for MVP - can be replaced with Supabase later

export interface User {
  id: string;
  name: string;
  displayName: string;
  age: number;
  totalScore: number;
}

export interface TopicProgress {
  topicId: string;
  topicName: string;
  completed: boolean;
  score: number;
}

export interface WrongAnswer {
  id: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  topic: string;
  errorType: string;
  timesWrong: number;
}

// Local storage keys
const USERS_KEY = "amc8_users";
const PROGRESS_KEY = "amc8_progress";
const WRONG_KEY = "amc8_wrong_answers";

// Initialize default data
export function initLocalDB() {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(USERS_KEY)) {
    const defaultUsers: User[] = [
      { id: "1", name: "matt", displayName: "Matt", age: 11, totalScore: 0 },
      { id: "2", name: "chris", displayName: "Chris", age: 9, totalScore: 0 },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
  
  if (!localStorage.getItem(PROGRESS_KEY)) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(WRONG_KEY)) {
    localStorage.setItem(WRONG_KEY, JSON.stringify([]));
  }
}

// Get current user
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return users[0] || null; // Default to Matt
}

// Set current user
export function setCurrentUser(userName: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("amc8_current_user", userName);
}

// Get user progress
export function getProgress(userId: string): TopicProgress[] {
  if (typeof window === "undefined") return [];
  const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]");
  return all.filter((p: any) => p.userId === userId);
}

// Add wrong answer
export function addWrongAnswer(answer: WrongAnswer) {
  if (typeof window === "undefined") return;
  const all = JSON.parse(localStorage.getItem(WRONG_KEY) || "[]");
  all.push({ ...answer, id: Date.now().toString() });
  localStorage.setItem(WRONG_KEY, JSON.stringify(all));
}

// Get wrong answers
export function getWrongAnswers(userId: string): WrongAnswer[] {
  if (typeof window === "undefined") return [];
  const all = JSON.parse(localStorage.getItem(WRONG_KEY) || "[]");
  return all.filter((a: any) => a.userId === userId);
}
