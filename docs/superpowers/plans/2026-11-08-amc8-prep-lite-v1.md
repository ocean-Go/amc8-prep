# AMC8 Prep Lite V1 — Implementation Plan (2026-11-08)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing site into a trustworthy private iPad learning loop: solve, diagnose, spaced review, and record, while the parent manages coaching via ChatGPT + Notion.

**Architecture:** Incrementally improve existing Next.js 14 code in `amc8-prep/`. Supabase is the sole runtime write store, Notion receives weekly summary only; the student never needs adult ChatGPT/Notion access. Every feature has its own Linear issue, branch and PR; no production deploy before security and question QA.

**Tech Stack:** Next.js 14, TypeScript, Supabase/PostgreSQL, Node test runner, Safari/PWA, Notion parent dashboard.

**Spec:** https://app.notion.com/p/412654a28f708136b8c6e0bc488aafe4

## Global Constraints

- Only work in `ocean-Go/amc8-prep`, respecting `AGENTS.md` and named Linear issue allowed paths.
- Matt has three entries: Today / Review / Mock. No free-form child-facing AI chat; adults review solutions.
- Persist all attempts with stable user/session; never overwrite the first independent attempt.
- Do not show unverified questions, broken OCR, missing images or reserved unseen mock years in routine practice.
- Server authorization and minimum database privileges required before collecting student data online.
- Do not read or print `.env.local` secrets. A code removal cannot remove prior public history.
- Verify actual results before merging. Keep unverified work in PRs.

## Review Focus

1. Tracked public `.env.local`: must rotate keys and address Git history, not just remove HEAD file.
2. Parsed but malformed question/diagram: validation must inspect quality, not just JSON shape.
3. Refreshed mid-question: preserve answer and remaining time, avoid duplicated submissions.
4. Client-provided `user_id`: server must authenticate/authorize both children separately.
5. One correct re-attempt after failure: must not mark mastered; require delayed retrieval.

---

### Task 1: Public-release safety gate — OCE-103

**Files:** `amc8-prep/.env.local` (untrack), `amc8-prep/.gitignore`, `scripts/check-public-release.mjs`, `scripts/tests/check-public-release.test.mjs`, `docs/security/release-blockers.md`, this plan.

**Interface:** `node scripts/check-public-release.mjs` exits nonzero for tracked local env or missing manual approvals; outputs no credential contents.

- [x] Step 1: Write a failing test for tracked secret file and missing approvals.
- [x] Step 2: Confirm RED (implementation missing).
- [x] Step 3: Implement fail-closed guard.
- [x] Step 4: Verify GREEN locally (3/3 Node tests).
- [ ] Step 5: Untrack env file and document history/rotation runbook.
- [ ] Step 6: PR to master, attach Linear, no merge or deploy.

### Task 2: Verified problem intake and mock isolation

**Files:** `amc8-prep/lib/server/problem-source.ts`, `amc8-prep/app/api/problems/route.ts`, `amc8-prep/app/api/mock/route.ts`, `amc8-prep/data/verified-question-ids.json`, `amc8-prep/lib/server/question-quality.ts`, `amc8-prep/tests/question-quality.test.mjs`, `docs/question-review-runbook.md`.

**Interface:** `isPracticeEligible(problem, reviewedIds)` only true after human QA; `getVerifiedQuestions(mode,year)` excludes reserved mock.

- [ ] Test TDD placeholder/garbled OCR/figure/verified fixture.
- [ ] Implement verified allowlist, provenance and image gate.
- [ ] Reject partial mock (must have 25 reviewed items from one unseen year).
- [ ] Review at least 50 candidate questions and verify original page/answers.
- [ ] Run tests; PR with separate Linear issue.

### Task 3: Auth and persistent attempts

**Files:** auth helpers/handlers, Supabase migration, attempt/dashboard/mock/wrong-book APIs and matching tests; exact allowed paths first recorded on issue.

**Interfaces:** `getSessionFromRequest(request)` provides verified user/role; `recordAttempt(input)` is idempotent, scoped and first-attempt preserving.

- [ ] Test 401 unauthenticated, 403 cross-child, retry idempotency and first-try preservation.
- [ ] Implement signed/HTTP-only session and server-derived user.
- [ ] Enforce RLS/minimum privilege; remove public service-role access.
- [ ] Verify production build and actual DB persist; open PR.

### Task 4: Spaced review and Today

**Files:** `amc8-prep/lib/review/scheduler.ts`, `amc8-prep/lib/recommendation/daily-task.ts`, tests, relevant API/page routes.

**Interfaces:** `advanceReview(previous,attempt,now)` returns next review +1,+3,+7,+14 days, resets after wrong/hinted; `generateTodayPack` returns up to 8 unique verified questions (2 warmup, 3 weakness, 2 due, 1 stretch).

- [ ] Write failing tests for wrong/correct delayed reviews, hints, relapses.
- [ ] Write tests for daily-pack uniqueness, verified source and reserved year exclusions.
- [ ] Implement and verify isolated scheduling logic.
- [ ] Integrate APIs and three-button iPad interface; PR after build tests.

### Task 5: Mock, reports and Notion weekly summary

**Files:** existing mock UI/API, parent-only dashboard; separate summary sync route and tests after defining Linear allowed paths.

- [ ] Test 25 verified questions/40-min server timer, no hint, resume after refresh.
- [ ] Test accurate mock bands (1–10/11–20/21–25).
- [ ] Build minimal parent report from first-attempt stats and retrieval progress.
- [ ] Sync only aggregated weekly summary to Notion; Notion failure cannot interrupt practice.
- [ ] Run actual iPad/Safari acceptance before any production release.

## Status

Design approved and execution authorized on 2026-11-08. Security issue OCE-103 started. Existing GitHub repo has functional page skeleton and endpoints but the public env file, weak auth, malformed parsed OCR questions and instant mastery block release. PRs are not production releases.
