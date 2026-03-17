import Link from "next/link";
import { amc8Topics } from "@/data/amc8-topics";

export default function TopicsPage() {
  const totalWeight = amc8Topics.reduce((sum, t) => sum + t.weight, 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">📚 知识点学习</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← 返回面板
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {amc8Topics.map((topic) => (
            <Link href={`/knowledge/${topic.id}`} key={topic.id} className="block">
              <div className="card hover:scale-105 transition cursor-pointer h-full">
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      topic.difficulty === "easy"
                        ? "bg-green-100 text-green-800"
                        : topic.difficulty === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {topic.difficulty === "easy"
                      ? "简单"
                      : topic.difficulty === "medium"
                      ? "中等"
                      : "困难"}
                  </span>
                  <span className="text-sm text-gray-500">{topic.weight}%</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {topic.nameCN}
                </h2>
                <p className="text-gray-600 text-sm">{topic.name}</p>
                <p className="text-gray-500 text-sm mt-2">{topic.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">📊 知识点权重分布</h3>
          <div className="space-y-2">
            {amc8Topics.map((topic) => (
              <div key={topic.id} className="flex items-center gap-4">
                <span className="w-32 text-gray-600">{topic.nameCN}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{ width: `${topic.weight}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">{topic.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
