alter table public.attempts
  drop constraint if exists attempts_problem_id_fkey;

alter table public.attempts
  alter column problem_id type text using problem_id::text;
