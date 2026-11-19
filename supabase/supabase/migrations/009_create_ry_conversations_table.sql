-- STRIDE: RY Coach conversations table (Path A - Analyse My Project)
-- Additive migration: does not modify existing tables or authentication.
-- Safe to re-run: uses IF NOT EXISTS and idempotent policy checks.

create extension if not exists pgcrypto;

create table if not exists public.ry_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'RY Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ry_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ry_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.ry_conversations enable row level security;
alter table public.ry_messages enable row level security;

-- Grant table privileges to authenticated users
grant select, insert, update, delete on table public.ry_conversations to authenticated;
grant select, insert, update, delete on table public.ry_messages to authenticated;

-- RLS Policies for conversations
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ry_conversations' and policyname='Users can read own RY conversations') then
    create policy "Users can read own RY conversations" on public.ry_conversations
    for select to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ry_conversations' and policyname='Users can create own RY conversations') then
    create policy "Users can create own RY conversations" on public.ry_conversations
    for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- RLS Policies for messages
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ry_messages' and policyname='Users can read own RY messages') then
    create policy "Users can read own RY messages" on public.ry_messages
    for select to authenticated
    using ((select auth.uid()) = (select user_id from public.ry_conversations where id = conversation_id));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ry_messages' and policyname='Users can create own RY messages') then
    create policy "Users can create own RY messages" on public.ry_messages
    for insert to authenticated with check ((select auth.uid()) = (select user_id from public.ry_conversations where id = conversation_id));
  end if;
end $$;
