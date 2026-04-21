# AMC8 Markdown Question Bank

Source repository for all AMC8 contest problems in markdown format, with paired diagram images.

## Data Source

- **Origin**: AoPS Wiki (Art of Problem Solving) — community-curated AMC8 pages
- **Copyright**: Mathematical Association of America (MAA). Reproduced with permission.
- **Source URL pattern**: `https://www.artofproblemsolving.com/wiki/index.php?title=AMC_8/Problem_{YEAR}`
- **Contest official**: `https://live.poshenloh.com/past-contests/amc8/{YEAR}`

## Year Coverage

| Years | Status | Notes |
|-------|--------|-------|
| 1999–2020 | ✅ Complete | |
| 2021 | ❌ Missing | AMC8 was not held in 2021 (COVID) |
| 2022–2025 | ✅ Complete | |
| **Total** | **27 years** | 675 problems |

## File Structure

```
content/amc8/markdown/
├── AMC8_1999.md
├── AMC8_2000.md
├── ...
├── AMC8_2025.md
└── images/
    ├── AMC8_1999_p1.png   ← problem 1 diagram (page 1)
    ├── AMC8_1999_p2.png   ← problem 2 diagram (page 2)
    ├── ...
    └── AMC8_2025_p21.png  ← 21 pages in 2025
```

## Image Naming Convention

Format: `AMC8_{YEAR}_p{N}.png`

- `{YEAR}` = 4-digit contest year
- `{N}` = 1-indexed page number within that year's PDF
- **Caution**: page number ≠ problem number. Multiple problems may appear on one page; some problems span pages.

## Markdown Format (Per Year File)

### 2017+ Format (clean, machine-readable)

```markdown
2025 AMC 8

## 📷 Pages (21 pages)

![[AMC8_2025_p1.png|page 1]]
...

1. [Question text]

A
B
C
D
E

[Option A text]
[Option B text]
[Option C text]
[Option D text]
[Option E text]

2. [Next question]
...

## Answer Key (2025 AMC 8)

| # | Answer |
|---|--------|
| 1 | **B** |
| 2 | **B** |
...
```

### 1999–2016 Format (AoPS wiki table — less regular)

Early years use raw AoPS wiki table syntax. Options are often inline with question text. Requires more robust parsing. See `scripts/import/markdown-parser.ts` for handling.

## Import Conventions (JSON Schema)

Each problem maps to this target schema for the Supabase `problems` table:

```typescript
type ImportedProblem = {
  id: string;                        // e.g. "amc8-2025-01"
  contest: "AMC8";
  year: number;                      // e.g. 2025
  problem_number: number;            // 1–25
  question_text: string;             // plain text, no markdown
  options: Record<"A"|"B"|"C"|"D"|"E", string>;
  correct_answer: "A"|"B"|"C"|"D"|"E";
  source_url: string;                // Po-Shen Loh live archive URL
};
```

### ID Format

```
amc8-{year}-{problem_number:02d}
```

Examples: `amc8-2025-01`, `amc8-1999-25`

### Source URL Pattern

```
https://live.poshenloh.com/past-contests/amc8/{year}
```

## Image Reference Syntax (Obsidian-compatible)

In markdown files, images are referenced as:

```markdown
![[AMC8_2025_p3.png|page 3]]
```

This is Obsidian's internal link syntax. When parsing for non-Obsidian consumers, resolve to:

```
images/AMC8_{YEAR}_p{N}.png
```

## Import Pipeline

See `scripts/import/markdown-parser.ts` for the parser that converts raw markdown → JSON.

## Validation

See `scripts/validate/problem-validator.ts` for automated checks:
- 25 problems per year
- A–E options present and non-empty
- `problem_id` globally unique
- Answer key present and consistent
- Image references resolvable

## Adding a New Year

1. Download PDF from `https://live.poshenloh.com/past-contests/amc8/{YEAR}`
2. Convert pages to images → `images/AMC8_{YEAR}_p{N}.png`
3. Extract problem text + options → `AMC8_{YEAR}.md`
4. Append answer key table
5. Run `scripts/validate/problem-validator.ts` to verify
6. Run `scripts/import/markdown-parser.ts` to generate JSON for Supabase
