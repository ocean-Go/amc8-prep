# AMC8 错题本修复 — Review 总结

## 已完成修复

### 1. 核心错题链路（闭环）
- `/api/problems` 只返回有答案、可判分的 normalized 题目
- `/api/attempts` 支持 normalized text id（如 `amc8-2025-01`）；本地 store 有答案则直接判分，不强求 UUID lookup
- 答错 → 自动创建/更新 `wrong_book` 条目，`status=review_pending`，`wrong_count++`
- 重复答错 → 刷新复习状态，`status` 仍为 `review_pending`
- 复盘答对 → `status=mastered`，错题本默认隐藏
- Dashboard 错题入口改到 `/wrong-book`（新 Supabase 错题本，不再指向旧的 localStorage demo）

### 2. Matt/Chris 用户隔离
- 新增 `lib/users.ts`：稳定的用户映射（`matt → ...0001`，`chris → ...0002`）
- Dashboard / Practice / Wrong-book 前端组件读取 `localStorage.amc8_current_user` 并传递给 API
- Server API 接受 `matt`/`chris` 别名或完整 UUID；UUID 正则修正（之前严格 UUID-v4 会把 `...0001`/`...0002` 当作不合规，静默 fallback 导致 Chris 数据归到 Matt）
- 本地 store 文件级隔离：`.data/amc8-dev-store.json` 包含 user_id 字段，查询严格按用户过滤

### 3. `/api/mock` Fallback
- 无 Supabase 时从本地 normalized JSON 加载 25 题并可判分
- 提交后本地计算得分、记录 `mock_runs`、Dashboard 显示最近模考成绩

### 4. Supabase Migrations 清理
- `20260404120000_contract_baseline_normalization.sql`：保护 `number → problem_number` rename（已有字段不再 rename）；`problem_id` 保持 text，不改回 UUID
- `20260317103000_create_problem_engine_tables.sql`：移除 `profiles(id) references auth.users` 依赖，因为 family-MVP 不使用 Supabase Auth
- 新增 `20260504144500_seed_family_profiles.sql`：直接 seed Matt/Chris 的 profile（无需 auth.users）

---

## 剩余已知限制（P2 / 未来改进项）

### 1. Auth 缺失 — 服务端无用户鉴权
**现状**：前端 localStorage 选择 Matt/Chris，API 接收 `user_id` 参数但无签名验证。任何人可以构造任意 `user_id` 的请求。

**影响**：在生产环境（公开互联网）中，客户端可以冒充任一用户写数据。

**缓解**：family-MVP，无外部威胁面。但若接入真实 Supabase 且 RLS 有约束时，service role key 绕过 RLL。

**建议**：后续接入 Supabase Auth session cookie（`@supabase/ssr`）后，在 API 中从 session 解析用户，忽略 client 传 `user_id`。

### 2. Service Role Key 用于公开 API
**现状**：`attempts`/`dashboard`/`wrong-book`/`mock` 等 API 优先使用 `SUPABASE_SERVICE_ROLE_KEY`。

**风险**：service role bypass RLS；加上无 auth，意味着任何请求都能以任意 user_id 写入。

**建议**：公开 endpoint 应使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` + RLS。当前是因为 RLS 无法与无 auth 用户配合，先用 service role 绕过。

### 3. 旧页面 `/wrong-answers` 未删除
**现状**：`app/wrong-answers/page.tsx` 是旧的 localStorage demo 页面，与新的 Supabase `/wrong-book` 并存。

**建议**：确认新错题本体验完整后，删除或归档 `/wrong-answers` 避免用户困惑。Dashboard 已指向正确入口。

### 4. `/api/mock` GET 题目无 local fallback
**现状**：`GET /api/mock` 若 Supabase 失败则直接 500，不像 `/api/problems` 有 normalized JSON fallback。

**说明**：已修 `POST /api/mock` 有 local fallback。`GET /api/mock` 同样已修（本次改动后也已支持 local fallback）。

### 5. Topic Filter 基本无效
**现状**：normalized JSON 无 topic 字段，`/api/problems?topic=X` 对大多数 topic 返回空。

**建议**：建立题目 tagging 元数据，或从 Supabase `problems.topic` 列读取。

---

## 验证结果
```
npm run lint   ✅
npm run build  ✅

API 测试（无 Supabase）：
  • 答错 → wrong_book 出现（user_id=chris, selected_wrong_answer=A）
  • 复盘答对 → wrong_book 清除（status=mastered 已隐藏）
  • Dashboard 显示正确 attempts_count 和最新 mock 成绩
  • Matt 数据不泄漏到 Chris；Chris 数据不泄漏到 Matt
```

---

## 本次修改的文件
```
app/api/attempts/route.ts       — local store 集成、normalized id 判分
app/api/dashboard/route.ts      — local store 降级、移除 console.warn
app/api/mock/route.ts           — local fallback、mock run 持久化
app/api/problems/route.ts       — 简化为调用 problem-source
app/api/wrong-book/route.ts     — local store 降级
app/dashboard/page.tsx          — 传递 current user_id
app/practice/page.tsx           — 传递 current user_id
components/mock/mock-exam.tsx   — 传递 current user_id
components/wrong-book/review-panel.tsx — 传递 current user_id
lib/types/practice.ts           — "mastered" action 加回
lib/users.ts                    — 新增：稳定用户映射
lib/server/problem-source.ts    — 新增：可判分题目加载
lib/server/local-progress-store.ts — 新增：本地 store（含 mock_runs）
supabase/migrations/20260317103000_create_problem_engine_tables.sql
supabase/migrations/20260404120000_contract_baseline_normalization.sql
supabase/migrations/20260504144500_seed_family_profiles.sql  — 新增
.gitignore                      — 新增
```