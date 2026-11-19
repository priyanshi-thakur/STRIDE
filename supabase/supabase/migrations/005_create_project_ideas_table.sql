-- STRIDE: Project ideas table (Path A - My Projects ideation workspace)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

-- pgcrypto extension is required for gen_random_uuid().
create extension if not exists pgcrypto;

create table if not exists public.project_ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  expected_benefit text not null default '',
  feasibility text not null default '',
  potential_limitations text not null default '',
  is_preferred boolean not null default false,
  preferred_rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure only one preferred idea per project at the database level
create unique index if not exists idx_project_ideas_one_preferred_per_project
  on public.project_ideas (project_id)
  where is_preferred = true;

-- Enable Row Level Security
alter table public.project_ideas enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.project_ideas to authenticated;

-- SELECT: users can read only their own project ideas
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_ideas'
      and policyname = 'Users can read own project ideas'
  ) then
    create policy "Users can read own project ideas"
    on public.project_ideas
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- INSERT: users can create only their own project ideas,
-- only for projects they own
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_ideas'
      and policyname = 'Users can create own project ideas'
  ) then
    drop policy "Users can create own project ideas" on public.project_ideas;
  end if;
end $$;

create policy "Users can create own project ideas"
on public.project_ideas
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

-- UPDATE: users can update only their own project ideas,
-- only for projects they own
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_ideas'
      and policyname = 'Users can update own project ideas'
  ) then
    drop policy "Users can update own project ideas" on public.project_ideas;
  end if;
end $$;

create policy "Users can update own project ideas"
on public.project_ideas
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

-- DELETE: users can delete only their own project ideas
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_ideas'
      and policyname = 'Users can delete own project ideas'
  ) then
    create policy "Users can delete own project ideas"
    on public.project_ideas
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Add ideation_completed flag to projects table
alter table public.projects
  add column if not exists ideation_completed boolean not null default false;

-- Grant privileges on the projects table to authenticated users
-- (Re-granting is safe and idempotent.)
grant select, insert, update, delete on table public.projects to authenticated;
