export interface PracticeProblem {
  id: string;
  year: number | null;
  contest: string | null;
  number: number | null;
  topic: string | null;
  question_text: string;
  options: string[];
}
