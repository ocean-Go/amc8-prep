import Link from "next/link";

import { amc8Topics } from "@/data/amc8-topics";

type KnowledgeTopicPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function KnowledgeTopicPage({ params }: KnowledgeTopicPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const normalizedSlug = decodedSlug.trim().toLowerCase().replace(/[_\s]+/g, "-");

  const topic = amc8Topics.find((item) => {
    const idMatch = item.id === decodedSlug || item.id === normalizedSlug;
    const englishNameMatch = item.name.trim().toLowerCase().replace(/[_\s]+/g, "-") === normalizedSlug;
    const chineseNameMatch = item.nameCN === decodedSlug;

    return idMatch || englishNameMatch || chineseNameMatch;
  });

  const topicInfo =
    topic ??
    ({
      id: normalizedSlug || "unknown-topic",
      name: "Knowledge Topic",
      nameCN: "知识点内容准备中",
      difficulty: "medium",
      description:
        "该知识点正在补充中。你可以先学习已上线的知识点，后续会逐步完善本页内容。",
      weight: 0,
    } as const);

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
                topicInfo.difficulty === "easy"
                  ? "bg-green-100 text-green-800"
                  : topicInfo.difficulty === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {topicInfo.difficulty === "easy"
                ? "简单"
                : topicInfo.difficulty === "medium"
                ? "中等"
                : "困难"}
            </span>
            <span className="text-sm text-gray-500">{topicInfo.weight}%</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">{topicInfo.nameCN}</h2>
          <p className="text-gray-600">{topicInfo.name}</p>
          <p className="text-gray-500 mt-4">{topicInfo.description}</p>

          {!topic && (
            <p className="text-sm text-gray-400 mt-4">当前路径: /knowledge/{decodedSlug}</p>
          )}
        </div>
      </div>
    </main>
  );
}
