-- STRIDE: Project external links columns (Path A - My Projects prototype & evaluation workspace)
-- Additive migration: only adds columns, does not modify existing data or structure.
-- Safe to re-run: uses IF NOT EXISTS pattern via ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

-- Add GitHub repository URL column
alter table public.projects
  add column if not exists github_url text;

-- Add live website URL column
alter table public.projects
  add column if not exists website_url text;

-- Grant privileges on the projects table to authenticated users
-- (Re-granting is safe and idempotent.)
grant select, insert, update, delete on table public.projects to authenticated;
