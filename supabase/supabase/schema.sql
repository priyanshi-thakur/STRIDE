-- STRIDE: Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  language_pref text not null default 'en'
    check (language_pref in ('en', 'hi')),
  created_at timestamptz not null default now()
);

-- Enable row-level security
alter table public.profiles enable row level security;

-- Users can read only their own profile
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Users can create only their own profile
create policy "Users can create own profile"
on public.profiles                
for insert
to authenticated
with check ((select auth.uid()) = id);

-- Users can update only their own profile
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);