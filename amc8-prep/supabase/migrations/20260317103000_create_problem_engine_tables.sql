create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  source text,
  year integer,
  contest text,
  number integer,
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
  problem_id uuid not null references public.problems (id) on delete cascade,
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
  problem_id uuid not null references public.problems (id) on delete cascade,
  last_attempt_id uuid references public.attempts (id) on delete set null,
  notes text,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, problem_id)
);

create table if not exists public.mock_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid unique references public.sessions (id) on delete set null,
  score integer,
  total_questions integer,
  duration_seconds integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_id_idx on public.attempts (user_id);
create index if not exists attempts_problem_id_idx on public.attempts (problem_id);
create index if not exists problems_topic_idx on public.problems (topic);
