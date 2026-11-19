-- STRIDE: Project evaluation reports table (Path A - Analyse My Project)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

-- pgcrypto extension is required for gen_random_uuid().
create extension if not exists pgcrypto;

create table if not exists public.project_evaluation_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_context jsonb not null default '{}'::jsonb,
  report_content jsonb not null default '{}'::jsonb,
  overall_assessment text,
  completeness_status text not null default 'not_verifiable'
    check (completeness_status in ('complete', 'pending', 'not_verifiable')),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.project_evaluation_reports enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.project_evaluation_reports to authenticated;

-- SELECT: users can read only their own project evaluation reports
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_evaluation_reports'
      and policyname = 'Users can read own project evaluation reports'
  ) then
    create policy "Users can read own project evaluation reports"
    on public.project_evaluation_reports
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- INSERT: users can create only their own project evaluation reports
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_evaluation_reports'
      and policyname = 'Users can create own project evaluation reports'
  ) then
    create policy "Users can create own project evaluation reports"
    on public.project_evaluation_reports
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- UPDATE: users can update only their own project evaluation reports
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_evaluation_reports'
      and policyname = 'Users can update own project evaluation reports'
  ) then
    create policy "Users can update own project evaluation reports"
    on public.project_evaluation_reports
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- DELETE: users can delete only their own project evaluation reports
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_evaluation_reports'
      and policyname = 'Users can delete own project evaluation reports'
  ) then
    create policy "Users can delete own project evaluation reports"
    on public.project_evaluation_reports
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;
