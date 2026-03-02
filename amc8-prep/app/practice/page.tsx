"use client";

import { useState } from "react";
import Link from "next/link";

const sampleQuestions = [
  {
    id: "2025-amc8-1",
    year: 2025,
    question: "What is the value of 2 + 4 + 6 + ... + 20?",
    options: ["A) 90", "B) 100", "C) 110", "D) 120", "E) 130"],
    answer: "C",
    explanation: "这是等差数列求和。(2+20)×10÷2=110",
  },
  {
    id: "2025-amc8-2",
    year: 2025,
    question: "If x + 5 = 12, what is x?",
    options: ["A) 5", "B) 6", "C) 7", "D) 8", "E) 9"],
    answer: "C",
    explanation: "x = 12 - 5 = 7",
  },
  {
    id: "2025-amc8-3",
    year: 2025,
    question: "What is the area of a rectangle with length 8 and width 5?",
    options: ["A) 13", "B) 26", "C) 40", "D) 80", "E) 120"],
    answer: "C",
    explanation: "面积 = 长 × 宽 =5 = 40 8 × ",
  },
];

export default function PracticePage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 minutes

  const question = sampleQuestions[current];

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelected(answer);
    setShowResult(true);
    if (answer === question.answer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (current < sampleQuestions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">✏️ 真题练习</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← 返回面板
          </Link>
        </div>

        {/* Timer */}
        <div className="card mb-6 text-center">
          <div className="text-4xl font-bold text-blue-600">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </div>
          <p className="text-gray-500">剩余时间</p>
        </div>

        {/* Progress */}
        <div className="flex justify-between items-center mb-4 text-white">
          <span>题目 {current + 1}/{sampleQuestions.length}</span>
          <span>得分: {score}/{current + (showResult ? 1 : 0)}</span>
        </div>

        {/* Question */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              AMC8 {question.year}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option) => {
              const letter = option.charAt(0);
              let buttonClass = "w-full p-4 text-left rounded-lg border-2 transition ";

              if (!showResult) {
                buttonClass +=
                  selected === letter
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300";
              } else {
                if (letter === question.answer) {
                  buttonClass += "border-green-500 bg-green-50";
                } else if (selected === letter) {
                  buttonClass += "border-red-500 bg-red-50";
                } else {
                  buttonClass += "border-gray-200";
                }
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  disabled={showResult}
                  className={buttonClass}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-800 mb-2">
                {selected === question.answer ? "✅ 回答正确！" : "❌ 回答错误"}
              </p>
              <p className="text-gray-600">{question.explanation}</p>

              <button
                onClick={nextQuestion}
                className="mt-4 btn-primary"
              >
                下一题 →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
