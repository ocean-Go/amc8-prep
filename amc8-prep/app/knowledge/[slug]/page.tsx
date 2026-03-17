import Link from "next/link";
import { notFound } from "next/navigation";

import { amc8Topics } from "@/data/amc8-topics";

type KnowledgeTopicPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function KnowledgeTopicPage({ params }: KnowledgeTopicPageProps) {
  const { slug } = await params;
  const topic = amc8Topics.find((item) => item.id === slug);

  if (!topic) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">📚 知识点学习</h1>
          <Link href="/topics" className="text-white hover:underline">
            ← 返回知识点列表
          </Link>
        </div>

        <div className="card">
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

          <h2 className="text-2xl font-bold text-gray-800 mb-2">{topic.nameCN}</h2>
          <p className="text-gray-600">{topic.name}</p>
          <p className="text-gray-500 mt-4">{topic.description}</p>
        </div>
      </div>
    </main>
  );
}
