-- P0 contract baseline normalization migration.
-- This migration upgrades pre-baseline schemas to the canonical contract for:
-- attempts, wrong_book, problems, and mock_runs.

-- 1) Canonicalize problems.
alter table public.problems
  alter column id type text using id::text;

alter table public.problems
  rename column number to problem_number;

-- 2) Canonicalize attempts.
alter table public.attempts
  alter column problem_id type text using problem_id::text;

alter table public.attempts
  drop constraint if exists attempts_problem_id_fkey;

alter table public.attempts
  add constraint attempts_problem_id_fkey
  foreign key (problem_id) references public.problems (id) on delete cascade;

-- 3) Canonicalize wrong_book.
alter table public.wrong_book
  alter column problem_id type text using problem_id::text;

alter table public.wrong_book
  drop constraint if exists wrong_book_problem_id_fkey;

alter table public.wrong_book
  add constraint wrong_book_problem_id_fkey
  foreign key (problem_id) references public.problems (id) on delete cascade;

alter table public.wrong_book
  drop column if exists last_attempt_id,
  drop column if exists notes,
  drop column if exists review_count,
  drop column if exists created_at;

alter table public.wrong_book
  add column if not exists wrong_count integer not null default 0,
  add column if not exists last_error_type text,
  add column if not exists status text,
  add column if not exists mastery_level integer,
  add column if not exists next_review_date date,
  add column if not exists updated_at timestamptz not null default now();

-- 4) Canonicalize mock_runs.
alter table public.mock_runs
  drop column if exists session_id,
  drop column if exists started_at,
  drop column if exists completed_at;

-- 5) Canonical support indexes.
create index if not exists wrong_book_user_id_idx on public.wrong_book (user_id);
create index if not exists mock_runs_user_id_idx on public.mock_runs (user_id);
