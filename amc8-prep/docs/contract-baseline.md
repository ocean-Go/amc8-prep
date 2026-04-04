# P0 Contract Baseline (OCE-22)

Date: 2026-04-04

This document freezes the canonical data contract for the core problem-engine tables.
All route-level queries and TypeScript DB types must align with these fields.

## Canonical tables

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
- Constraint: `unique(user_id, problem_id)`

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

## Legacy fields removed/replaced

### Removed from `wrong_book`
- `last_attempt_id`
- `notes`
- `review_count`
- `created_at`

### Removed from `mock_runs`
- `session_id`
- `started_at`
- `completed_at`

### Replaced/renamed
- `problems.number` → `problems.problem_number`
- `mock_runs.time_used_sec` (route assumption) → `mock_runs.duration_seconds`

### Conflicting prior contract normalized
- `attempts.problem_id` was temporarily changed to `text` and FK was dropped.
- Baseline contract sets `attempts.problem_id` back to `uuid` with FK to `problems(id)`.
