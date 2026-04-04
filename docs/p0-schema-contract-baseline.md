# P0 Contract Baseline (OCE-22)

This document freezes the canonical schema contract for the AMC8 problem engine tables and acts as the single source of truth for route-level field names.

## Canonical Contracts

### `attempts`
- `id`
- `user_id`
- `problem_id`
- `session_id`
- `selected_option`
- `is_correct`
- `time_spent_seconds`
- `submitted_at`
- `created_at`

### `wrong_book`
- `id`
- `user_id`
- `problem_id`
- `wrong_count`
- `last_error_type`
- `status`
- `mastery_level`
- `next_review_date`
- `updated_at`
- unique: `(user_id, problem_id)`

### `problems`
- `id`
- `source`
- `year`
- `contest`
- `problem_number`
- `topic`
- `difficulty`
- `question`
- `options`
- `answer`
- `methods`
- `hints`
- `created_at`

### `mock_runs`
- `id`
- `user_id`
- `score`
- `duration_seconds`
- `total_questions`
- `created_at`

## Legacy Drift Removed / Replaced

### `problems`
- Replaced legacy `number` with canonical `problem_number`.

### `attempts`
- Re-established `problem_id` as a canonical foreign key to `problems.id` after prior drift.

### `wrong_book`
- Removed legacy `last_attempt_id`.
- Removed legacy `notes`.
- Removed legacy `review_count`.
- Removed legacy `created_at`.
- Added canonical `wrong_count`, `last_error_type`, `status`, `mastery_level`, `next_review_date`, and `updated_at`.

### `mock_runs`
- Removed legacy `session_id`.
- Removed legacy `started_at`.
- Removed legacy `completed_at`.

## Type Contract Alignment

TypeScript database types in `amc8-prep/lib/types/problem-engine.ts` are aligned with this contract and should be considered the app-side schema mirror for these tables.
