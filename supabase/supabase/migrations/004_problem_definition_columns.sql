-- STRIDE: Problem definition columns for projects table (Path A - My Projects)
-- Additive migration: only adds columns, does not modify existing data or structure.
-- Safe to re-run: uses IF NOT EXISTS pattern via ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

-- pgcrypto extension is required for gen_random_uuid() (used by projects table).
create extension if not exists pgcrypto;

-- Add refined problem statement column
alter table public.projects
  add column if not exists refined_problem_statement text;

-- Add target users column
alter table public.projects
  add column if not exists target_users text;

-- Add problem evidence column
alter table public.projects
  add column if not exists problem_evidence text;

-- Add problem definition completion flag
alter table public.projects
  add column if not exists problem_definition_completed boolean not null default false;

-- Grant privileges on the projects table to authenticated users
-- (Re-granting is safe and idempotent.)
grant select, insert, update, delete on table public.projects to authenticated;
