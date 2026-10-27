-- Training is isolated from rooms/scores and is never client writable.
create table if not exists public.training_sessions (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete cascade,
 mode text not null check (mode in ('classic','strategy')),
 difficulty text not null check (difficulty in ('acemi','sancak','serdar')),
 state jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 finished_at timestamptz
);
create index if not exists training_owner_active on public.training_sessions(player_id,created_at desc) where finished_at is null;
create table if not exists public.training_scores (
 session_id uuid primary key references public.training_sessions(id) on delete cascade,
 player_id uuid not null references public.players(id) on delete cascade,
 mode text not null check (mode in ('classic','strategy')),
 difficulty text not null check (difficulty in ('acemi','sancak','serdar')),
 score integer not null check (score between 0 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists training_ranking on public.training_scores(mode,difficulty,score desc,created_at);
alter table public.training_sessions enable row level security;
alter table public.training_scores enable row level security;
revoke all on public.training_sessions,public.training_scores from anon,authenticated;
