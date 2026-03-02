import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          🧮 AMC8 备考系统
        </h1>
        <p className="text-xl text-white/80">
          为 Matt 和 Chris 准备的竞赛备考系统
        </p>
        <p className="text-white/60 mt-2">
          距离 2027年1月23日竞赛还有约 10 个月
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Matt's Card */}
        <Link href="/dashboard/matt" className="block">
          <div className="card hover:scale-105 transition-transform cursor-pointer">
            <div className="text-center">
              <div className="text-6xl mb-4">👦</div>
              <h2 className="text-2xl font-bold text-gray-800">Matt</h2>
              <p className="text-gray-600 mt-2">11 岁</p>
              <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm">
                上次得分: 9/25
              </div>
              <p className="text-sm text-gray-500 mt-2">
                已有基础，继续提升！
              </p>
            </div>
          </div>
        </Link>

        {/* Chris's Card */}
        <Link href="/dashboard/chris" className="block">
          <div className="card hover:scale-105 transition-transform cursor-pointer">
            <div className="text-center">
              <div className="text-6xl mb-4">👶</div>
              <h2 className="text-2xl font-bold text-gray-800">Chris</h2>
              <p className="text-gray-600 mt-2">9 岁</p>
              <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm">
                初次备考
              </div>
              <p className="text-sm text-gray-500 mt-2">
                从零开始，潜力无限！
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-12 text-white/60 text-sm">
        © 2026 AMC8 Prep System | Made with ❤️
      </div>
    </main>
  );
}
