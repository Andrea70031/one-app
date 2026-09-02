-- ONE unified core
-- Adds ONE's personal memory/action layer to the existing construction backend.

create table if not exists public.one_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  kind text not null default 'note',
  title text not null,
  summary text,
  source_type text,
  source_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.one_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  type text not null default 'activity',
  title text not null,
  detail text,
  icon text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.one_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  kind text not null,
  label text,
  status text not null default 'created',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.one_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  title text not null,
  note text,
  due_at timestamptz,
  completed boolean not null default false,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists one_memories_user_created_idx on public.one_memories (user_id, created_at desc);
create index if not exists one_memories_site_idx on public.one_memories (site_id) where site_id is not null;
create index if not exists one_activities_user_created_idx on public.one_activities (user_id, created_at desc);
create index if not exists one_activities_site_idx on public.one_activities (site_id) where site_id is not null;
create index if not exists one_actions_user_created_idx on public.one_actions (user_id, created_at desc);
create index if not exists one_actions_site_idx on public.one_actions (site_id) where site_id is not null;
create index if not exists one_reminders_user_due_idx on public.one_reminders (user_id, completed, due_at);
create index if not exists one_reminders_site_idx on public.one_reminders (site_id) where site_id is not null;

alter table public.one_memories enable row level security;
alter table public.one_activities enable row level security;
alter table public.one_actions enable row level security;
alter table public.one_reminders enable row level security;

create policy "one_memories_select_own" on public.one_memories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "one_memories_insert_own" on public.one_memories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "one_memories_update_own" on public.one_memories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "one_memories_delete_own" on public.one_memories
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "one_activities_select_own" on public.one_activities
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "one_activities_insert_own" on public.one_activities
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "one_activities_update_own" on public.one_activities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "one_activities_delete_own" on public.one_activities
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "one_actions_select_own" on public.one_actions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "one_actions_insert_own" on public.one_actions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "one_actions_update_own" on public.one_actions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "one_actions_delete_own" on public.one_actions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "one_reminders_select_own" on public.one_reminders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "one_reminders_insert_own" on public.one_reminders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "one_reminders_update_own" on public.one_reminders
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "one_reminders_delete_own" on public.one_reminders
  for delete to authenticated using ((select auth.uid()) = user_id);

