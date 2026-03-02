# AMC8 备考系统

为 Matt (11岁) 和 Chris (9岁) 准备的 AMC8 竞赛备考系统。

## 🛠️ 技术栈

- **前端**: Next.js 14 + TypeScript + TailwindCSS
- **后端**: Next.js API Routes (Serverless)
- **数据库**: Supabase (PostgreSQL)
- **AI**: MiniMax M2.5

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/ocean-Go/amc8-prep-system.git
cd amc8-prep-system/amc8-prep
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase 和 MiniMax API Key
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署到 Vercel
```bash
npm i -g vercel
vercel --prod
```

## 📋 功能清单

- [x] 首页 - 选择用户 (Matt/Chris)
- [x] 学习面板 - 进度概览
- [ ] 知识点学习
- [ ] 真题练习
- [ ] 错题本
- [ ] AI 讲解

## 📅 时间线

- **2026-03-02**: MVP 框架搭建
- **2026-03-09**: 完成核心功能
- **2026-06-01**: 第一轮复习
- **2026-09-01**: 强化训练
- **2027-01-23**: AMC8 竞赛

## 📄 许可证

MIT
