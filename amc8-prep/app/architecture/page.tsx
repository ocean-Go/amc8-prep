import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AMC8 架构总览",
  description: "家庭 AMC8 备考系统全栈设计与 NotebookLM 集成总览",
};

type SectionProps = {
  title: string;
  children: ReactNode;
};

const baseCardClassName = "rounded-3xl border border-white/10 bg-slate-900/70 p-7 sm:p-10 shadow-2xl";

function SectionCard({ title, children }: SectionProps) {
  return (
    <section className={baseCardClassName} aria-label={title}>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const positioning = [
  "家长端: 多子女学习监督、计划配置、对比报表。",
  "子女端: 知识点学习、真题模考、错题复习、学习报告。",
  "外部知识源: Google NotebookLM 负责来源检索与可解释引用。",
];

const architecture = [
  "前端层: 场景化展示 + 个性化学习界面。",
  "后端层: JWT 鉴权、角色权限、复习/评分业务逻辑。",
  "数据层: 学习记录、错题记录、计划与来源引用映射。",
  "外部知识层: NotebookLM 接入、来源追踪、审计可追溯。",
];

const qualityGoals = [
  "关键操作响应 < 500ms",
  "问答来源引用率 = 100%",
  "测试覆盖率目标 >= 80%",
  "严格 parent_id/child_id 数据隔离",
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#050b2a] text-slate-100 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className={baseCardClassName}>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">家庭 AMC8 备考系统全栈设计</h1>
          <p className="mt-4 text-lg text-slate-300">聚焦「AMC8 专业备考 + 多子女数据隔离 + NotebookLM 知识增强」。</p>
        </section>

        <SectionCard title="核心定位">
          <ul className="list-disc space-y-2 pl-6 text-lg text-slate-300">
            {positioning.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="架构摘要">
          <ul className="list-disc space-y-2 pl-6 text-lg text-slate-300">
            {architecture.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="关键质量目标">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {qualityGoals.map((goal) => (
              <div
                key={goal}
                className="rounded-2xl border border-cyan-300/20 bg-slate-800/70 px-4 py-5 text-center text-lg text-slate-200"
              >
                {goal}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="文档">
          <p className="text-xl text-slate-300">
            完整设计见：
            <Link
              className="ml-2 underline text-sky-300 hover:text-sky-200"
              href="/docs/family-amc8-fullstack-notebooklm-plan.md"
              target="_blank"
              rel="noreferrer"
            >
              family-amc8-fullstack-notebooklm-plan.md
            </Link>
          </p>
          <p className="mt-3 text-slate-400">
            优化记录见：
            <Link
              className="ml-2 underline text-sky-300 hover:text-sky-200"
              href="/docs/architecture-optimization-log.md"
              target="_blank"
              rel="noreferrer"
            >
              architecture-optimization-log.md
            </Link>
          </p>
        </SectionCard>

        <p className="text-slate-400">Prepared for Vercel static deployment.</p>
      </div>
    </main>
  );
}
