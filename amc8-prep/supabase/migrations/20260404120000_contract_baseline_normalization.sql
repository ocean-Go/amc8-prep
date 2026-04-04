-- P0 contract baseline normalization for attempts, wrong_book, problems, and mock_runs

-- problems: canonical field name
alter table public.problems
  rename column number to problem_number;

-- attempts: restore canonical problem_id relationship contract
alter table public.attempts
  alter column problem_id type uuid using problem_id::uuid;

alter table public.attempts
  add constraint attempts_problem_id_fkey
  foreign key (problem_id) references public.problems (id) on delete cascade;

-- wrong_book: drop legacy fields and align canonical contract
alter table public.wrong_book
  drop column if exists last_attempt_id,
  drop column if exists notes,
  drop column if exists review_count,
  drop column if exists created_at,
  add column if not exists wrong_count integer not null default 0,
  add column if not exists last_error_type text,
  add column if not exists status text not null default 'review_pending',
  add column if not exists mastery_level integer not null default 0,
  add column if not exists next_review_date date,
  add column if not exists updated_at timestamptz not null default now();

-- mock_runs: remove legacy session tracking fields
alter table public.mock_runs
  drop column if exists session_id,
  drop column if exists started_at,
  drop column if exists completed_at;

-- ensure existing rows have non-null defaults for canonical columns
update public.wrong_book
set
  wrong_count = coalesce(wrong_count, 0),
  status = coalesce(status, 'review_pending'),
  mastery_level = coalesce(mastery_level, 0),
  updated_at = coalesce(updated_at, now())
where wrong_count is null
   or status is null
   or mastery_level is null
   or updated_at is null;

-- enforce canonical non-null constraints after backfill
alter table public.wrong_book
  alter column wrong_count set not null,
  alter column status set not null,
  alter column mastery_level set not null,
  alter column updated_at set not null;
