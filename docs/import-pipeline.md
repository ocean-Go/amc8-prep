# AMC8 Problem Import Pipeline (Sample Dataset)

This runbook imports the initial AMC8 sample dataset into the `problems` table.

## Files

- Dataset: `data/seeds/amc8-sample.json`
- Import script: `scripts/import-problems.ts`

## Data format

Each item in the sample dataset follows:

- `id`: `amc8-YYYY-N`
- `contest`: `AMC8`
- `year`: number
- `problem_number`: number
- `question_text`: string
- `options`: object with keys `A`..`E`
- `correct_answer`: `A`..`E`
- `source_url`: string

## Prerequisites

Set Supabase environment variables:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## Validate dataset only (no writes)

```bash
node --experimental-strip-types scripts/import-problems.ts --dry-run
```

Expected output:

- `Dry run: validated 25 AMC8 sample problems from data/seeds/amc8-sample.json.`

## Import into `problems`

```bash
node --experimental-strip-types scripts/import-problems.ts
```

The script uses Supabase REST upsert with `on_conflict=id` and `resolution=merge-duplicates`.

## Duplicate handling

- Duplicate rows are prevented by upsert key `id`.
- Re-running import updates existing rows with the same `id` instead of creating duplicates.

## Notes

- The script writes both the required AMC8 sample fields and compatibility fields (`number`, `question`, `answer`, etc.) to fit existing table variants.
- No UI modules are touched by this pipeline.
