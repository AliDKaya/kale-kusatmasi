-- Yeni, yalnızca bu oyuna ayrılmış Supabase projesinde SQL Editor > New query > Run.
begin;
create table public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  last_score_at timestamptz,
  last_mutation_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z2-9]{6}$'),
  state jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  side smallint not null check (side in (0,1)),
  nickname text not null,
  primary key (room_id, player_id), unique (room_id, side)
);
create table public.orders (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  turn integer not null check (turn between 1 and 10),
  payload jsonb not null default '[]'::jsonb check (jsonb_typeof(payload) = 'array' and jsonb_array_length(payload) <= 2),
  ready boolean not null default false,
  primary key (room_id, player_id, turn)
);
create table public.operations (
  player_id uuid not null references public.players(id) on delete cascade,
  operation_id uuid not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, operation_id)
);
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  player_id uuid not null references public.players(id),
  nickname text not null,
  score integer not null check (score between 0 and 1000),
  created_at timestamptz not null default now(),
  unique (room_id, player_id)
);
create index scores_ranking on public.scores (score desc, created_at asc, id asc);
create index membership_by_player on public.room_players (player_id, room_id);
alter table public.players enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.orders enable row level security;
alter table public.operations enable row level security;
alter table public.scores enable row level security;
-- İstemciye ham tabloları açma. Doğrulanmış Route Handler yalnızca sunucu DATABASE_URL kullanır.
revoke all on public.players, public.rooms, public.room_players, public.orders, public.operations, public.scores from anon, authenticated;

create function public.is_room_member(room_uuid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_players where room_id = room_uuid and player_id = (select auth.uid()));
$$;
revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

create policy "Members receive room broadcasts and presence" on realtime.messages
for select to authenticated using (
  (realtime.topic() = 'leaderboard' and extension = 'broadcast') or
  (realtime.topic() ~ '^room:[0-9a-f-]{36}$' and public.is_room_member(substring(realtime.topic() from 6)::uuid))
);
create policy "Members publish presence only" on realtime.messages
for insert to authenticated with check (
  extension = 'presence' and realtime.topic() ~ '^room:[0-9a-f-]{36}$'
  and public.is_room_member(substring(realtime.topic() from 6)::uuid)
);

-- realtime.send aynı işlemin içindedir; rollback olmuş bir tur / skor yayınlanamaz.
create function public.notify_room_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('version', NEW.version), 'changed', 'room:' || NEW.id::text, true);
  return NEW;
end;
$$;
create trigger room_changed after update of version on public.rooms for each row execute function public.notify_room_change();
create function public.notify_score_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('updated', true), 'changed', 'leaderboard', true);
  return NEW;
end;
$$;
create trigger score_changed after insert on public.scores for each statement execute function public.notify_score_change();
revoke all on function public.notify_room_change(), public.notify_score_change() from public, anon, authenticated;
commit;
