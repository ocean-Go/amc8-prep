import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">学习面板</h1>
          <Link href="/" className="text-white hover:underline">
            ← 返回首页
          </Link>
        </div>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">📚 学习进度</h3>
            <p className="text-4xl font-bold text-blue-600">12/40</p>
            <p className="text-gray-500 text-sm">已完成知识点</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">✅ 正确率</h3>
            <p className="text-4xl font-bold text-green-600">75%</p>
            <p className="text-gray-500 text-sm">本周练习</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">📝 错题数</h3>
            <p className="text-4xl font-bold text-red-600">23</p>
            <p className="text-gray-500 text-sm">需要复习</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/topics" className="block">
            <div className="card text-center hover:bg-blue-50 transition cursor-pointer">
              <div className="text-4xl mb-2">📖</div>
              <h3 className="text-xl font-semibold">知识点学习</h3>
              <p className="text-gray-500 text-sm">系统学习 AMC8 考点</p>
            </div>
          </Link>
          <Link href="/practice" className="block">
            <div className="card text-center hover:bg-green-50 transition cursor-pointer">
              <div className="text-4xl mb-2">✏️</div>
              <h3 className="text-xl font-semibold">真题练习</h3>
              <p className="text-gray-500 text-sm">历年真题强化训练</p>
            </div>
          </Link>
          <Link href="/wrong-answers" className="block">
            <div className="card text-center hover:bg-red-50 transition cursor-pointer">
              <div className="text-4xl mb-2">📕</div>
              <h3 className="text-xl font-semibold">错题本</h3>
              <p className="text-gray-500 text-sm">复习薄弱知识点</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">📋 最近学习记录</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>完成「代数基础」</span>
              <span className="text-gray-500 text-sm">今天 10:30</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>练习题「几何」- 正确率 80%</span>
              <span className="text-gray-500 text-sm">昨天 15:20</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>新增错题 3 道</span>
              <span className="text-gray-500 text-sm">昨天 15:15</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
