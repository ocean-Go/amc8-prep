"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { amc8Questions } from "@/data/amc8-questions";

export default function PracticePage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState(amc8Questions);

  useEffect(() => {
    // 随机打乱题目顺序
    const shuffled = [...amc8Questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled.slice(0, 10)); // 每次随机10道
  }, []);

  const question = shuffledQuestions[current];

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelected(answer);
    setShowResult(true);
    if (answer === question.answer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (current < shuffledQuestions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">✏️ 真题练习</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← 返回
          </Link>
        </div>

        {/* Progress */}
        <div className="flex justify-between items-center mb-4 text-white">
          <span>题目 {current + 1}/{shuffledQuestions.length}</span>
          <span>得分: {score}/{current + (showResult ? 1 : 0)}</span>
        </div>

        {/* Question */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              AMC8 {question.year}
            </span>
            <span className="text-gray-500 text-sm">{question.topic}</span>
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

              <button onClick={nextQuestion} className="mt-4 btn-primary">
                {current < shuffledQuestions.length - 1 ? "下一题 →" : "完成练习"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
