-- STRIDE: Project research notes table (Path A - My Projects research workspace)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

-- pgcrypto extension is required for gen_random_uuid().
create extension if not exists pgcrypto;

create table if not exists public.project_research_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.project_research_notes enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.project_research_notes to authenticated;

-- SELECT: users can read only their own project research notes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_research_notes'
      and policyname = 'Users can read own project research notes'
  ) then
    create policy "Users can read own project research notes"
    on public.project_research_notes
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- INSERT: users can create only their own project research notes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_research_notes'
      and policyname = 'Users can create own project research notes'
  ) then
    create policy "Users can create own project research notes"
    on public.project_research_notes
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- UPDATE: users can update only their own project research notes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_research_notes'
      and policyname = 'Users can update own project research notes'
  ) then
    create policy "Users can update own project research notes"
    on public.project_research_notes
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- DELETE: users can delete only their own project research notes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_research_notes'
      and policyname = 'Users can delete own project research notes'
  ) then
    create policy "Users can delete own project research notes"
    on public.project_research_notes
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;
