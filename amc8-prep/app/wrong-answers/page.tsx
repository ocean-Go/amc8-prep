"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WrongAnswer {
  id: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  topic: string;
  timesWrong: number;
}

export default function WrongAnswersPage() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("amc8_wrong_answers");
    if (saved) {
      setWrongAnswers(JSON.parse(saved));
    } else {
      // Demo data
      const demo: WrongAnswer[] = [
        {
          id: "1",
          questionId: "2024-amc8-1",
          question: "How many positive divisors does 12 have?",
          userAnswer: "4",
          correctAnswer: "C",
          topic: "数论",
          timesWrong: 2,
        },
        {
          id: "2", 
          questionId: "2023-amc8-2",
          question: "If today is Monday, what day will it be in 100 days?",
          userAnswer: "Tuesday",
          correctAnswer: "Wednesday",
          topic: "逻辑",
          timesWrong: 1,
        },
      ];
      setWrongAnswers(demo);
      localStorage.setItem("amc8_wrong_answers", JSON.stringify(demo));
    }
  }, []);

  const clearAll = () => {
    if (confirm("确定清空所有错题吗？")) {
      setWrongAnswers([]);
      localStorage.removeItem("amc8_wrong_answers");
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">📕 错题本</h1>
          <div className="flex gap-4">
            <Link href="/practice" className="text-white hover:underline">
              继续练习 →
            </Link>
            <Link href="/dashboard" className="text-white hover:underline">
              ← 返回
            </Link>
          </div>
        </div>

        {wrongAnswers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-gray-800">太棒了！</h2>
            <p className="text-gray-600 mt-2">目前没有错题，继续保持！</p>
            <Link href="/practice" className="btn-primary mt-6 inline-block">
              去练习
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white">
                共 {wrongAnswers.length} 道错题
              </span>
              <button
                onClick={clearAll}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                清空全部
              </button>
            </div>

            <div className="space-y-4">
              {wrongAnswers.map((item, index) => (
                <div key={item.id} className="card">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs">
                      {item.topic}
                    </span>
                    <span className="text-gray-400 text-sm">
                      错误 {item.timesWrong} 次
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {index + 1}. {item.question}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <span className="text-red-600 font-semibold">❌ 你的答案: </span>
                      <span className="text-gray-700">{item.userAnswer}</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <span className="text-green-600 font-semibold">✅ 正确答案: </span>
                      <span className="text-gray-700">{item.correctAnswer}</span>
                    </div>
                  </div>

                  <button className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    查看解析
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
