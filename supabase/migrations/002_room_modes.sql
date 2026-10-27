begin;
alter table public.rooms add column if not exists mode text not null default 'classic' check (mode in ('classic','strategy'));
alter table public.orders drop constraint if exists orders_turn_check;
alter table public.orders add constraint orders_turn_check check (turn between 1 and 16);
alter table public.orders drop constraint if exists orders_payload_check;
alter table public.orders add constraint orders_payload_check check (jsonb_typeof(payload) = 'array' and jsonb_array_length(payload) <= 4);
commit;
