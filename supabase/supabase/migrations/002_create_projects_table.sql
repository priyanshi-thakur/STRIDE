-- STRIDE: Projects table (Path A - My Projects)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

-- pgcrypto extension is required for gen_random_uuid().
-- Enable it if not already enabled (typically enabled by default on Supabase).
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null default 'Engineering & Software Innovation',
  problem_statement text not null,
  learning_objective text,
  current_stage text not null default 'research',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (idempotent: no-op if already enabled)
alter table public.projects enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.projects to authenticated;

-- SELECT: users can read only their own projects
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can read own projects'
  ) then
    create policy "Users can read own projects"
    on public.projects
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- INSERT: users can create only their own projects (user_id cannot be spoofed)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can create own projects'
  ) then
    create policy "Users can create own projects"
    on public.projects
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- UPDATE: users can update only their own projects
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can update own projects'
  ) then
    create policy "Users can update own projects"
    on public.projects
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- DELETE: users can delete only their own projects
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can delete own projects'
  ) then
    create policy "Users can delete own projects"
    on public.projects
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;
