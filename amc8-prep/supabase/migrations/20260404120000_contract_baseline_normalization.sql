-- P0 contract baseline normalization for attempts, wrong_book, problems, and mock_runs.
-- Keep problem ids canonical as text because the app/local normalized corpus uses ids like amc8-2025-01.

-- problems: canonical field name. Fresh schemas already use problem_number, so guard the rename.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'problems'
      and column_name = 'number'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'problems'
      and column_name = 'problem_number'
  ) then
    alter table public.problems rename column number to problem_number;
  end if;
end $$;

-- attempts/wrong_book: keep FK type aligned with public.problems(id text).
alter table public.problems
  alter column id type text using id::text;

alter table public.attempts
  drop constraint if exists attempts_problem_id_fkey;

alter table public.attempts
  alter column problem_id type text using problem_id::text;

alter table public.attempts
  add constraint attempts_problem_id_fkey
  foreign key (problem_id) references public.problems (id) on delete cascade;

alter table public.wrong_book
  drop constraint if exists wrong_book_problem_id_fkey;

alter table public.wrong_book
  alter column problem_id type text using problem_id::text;

alter table public.wrong_book
  add constraint wrong_book_problem_id_fkey
  foreign key (problem_id) references public.problems (id) on delete cascade;

-- wrong_book: drop legacy fields and align canonical review contract.
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

-- mock_runs: remove legacy session tracking fields.
alter table public.mock_runs
  drop column if exists session_id,
  drop column if exists started_at,
  drop column if exists completed_at;

-- ensure existing rows have non-null defaults for canonical columns.
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

-- enforce canonical non-null constraints after backfill.
alter table public.wrong_book
  alter column wrong_count set not null,
  alter column status set not null,
  alter column mastery_level set not null,
  alter column updated_at set not null;

create index if not exists attempts_user_id_idx on public.attempts (user_id);
create index if not exists attempts_problem_id_idx on public.attempts (problem_id);
create index if not exists wrong_book_user_id_idx on public.wrong_book (user_id);
create index if not exists mock_runs_user_id_idx on public.mock_runs (user_id);
