create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id text primary key,
  source text,
  year integer,
  contest text,
  problem_number integer,
  topic text not null,
  difficulty smallint,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  methods jsonb not null default '[]'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sessions_mode_check check (mode in ('practice', 'review', 'mock'))
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id text not null references public.problems (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  selected_option text,
  is_correct boolean not null,
  time_spent_seconds integer,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.wrong_book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id text not null references public.problems (id) on delete cascade,
  wrong_count integer not null default 0,
  last_error_type text,
  status text,
  mastery_level integer,
  next_review_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, problem_id)
);

create table if not exists public.mock_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer,
  duration_seconds integer,
  total_questions integer,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_id_idx on public.attempts (user_id);
create index if not exists attempts_problem_id_idx on public.attempts (problem_id);
create index if not exists problems_topic_idx on public.problems (topic);
create index if not exists wrong_book_user_id_idx on public.wrong_book (user_id);
create index if not exists mock_runs_user_id_idx on public.mock_runs (user_id);
