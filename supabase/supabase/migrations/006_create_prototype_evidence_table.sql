-- STRIDE: Project prototype evidence table (Path A - My Projects prototype & evaluation workspace)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

-- pgcrypto extension is required for gen_random_uuid().
create extension if not exists pgcrypto;

-- Create storage bucket for prototype evidence (idempotent)
insert into storage.buckets (id, name, public)
values ('prototype-evidence', 'prototype-evidence', false)
on conflict (id) do update set public = false;

create table if not exists public.project_prototype_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  description text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.project_prototype_evidence enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.project_prototype_evidence to authenticated;

-- SELECT: users can read only their own project prototype evidence
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_prototype_evidence'
      and policyname = 'Users can read own project prototype evidence'
  ) then
    create policy "Users can read own project prototype evidence"
    on public.project_prototype_evidence
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- INSERT: users can create only their own project prototype evidence,
-- only for projects they own
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_prototype_evidence'
      and policyname = 'Users can create own project prototype evidence'
  ) then
    drop policy "Users can create own project prototype evidence" on public.project_prototype_evidence;
  end if;
end $$;

create policy "Users can create own project prototype evidence"
on public.project_prototype_evidence
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

-- UPDATE: users can update only their own project prototype evidence,
-- only for projects they own
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_prototype_evidence'
      and policyname = 'Users can update own project prototype evidence'
  ) then
    drop policy "Users can update own project prototype evidence" on public.project_prototype_evidence;
  end if;
end $$;

create policy "Users can update own project prototype evidence"
on public.project_prototype_evidence
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

-- DELETE: users can delete only their own project prototype evidence
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_prototype_evidence'
      and policyname = 'Users can delete own project prototype evidence'
  ) then
    create policy "Users can delete own project prototype evidence"
    on public.project_prototype_evidence
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Supabase Storage policies for prototype-evidence bucket
-- Storage policies are RLS policies on storage.objects and appear in pg_policies.

-- Users can upload their own prototype evidence files
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their own prototype evidence'
  ) then
    drop policy "Users can upload their own prototype evidence" on storage.objects;
  end if;
end $$;

create policy "Users can upload their own prototype evidence"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'prototype-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Users can view their own prototype evidence files
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can view their own prototype evidence'
  ) then
    drop policy "Users can view their own prototype evidence" on storage.objects;
  end if;
end $$;

create policy "Users can view their own prototype evidence"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'prototype-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Users can delete their own prototype evidence files
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their own prototype evidence'
  ) then
    drop policy "Users can delete their own prototype evidence" on storage.objects;
  end if;
end $$;

create policy "Users can delete their own prototype evidence"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'prototype-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Add prototype_completed flag to projects table
alter table public.projects
  add column if not exists prototype_completed boolean not null default false;

-- Grant privileges on the projects table to authenticated users
-- (Re-granting is safe and idempotent.)
grant select, insert, update, delete on table public.projects to authenticated;
