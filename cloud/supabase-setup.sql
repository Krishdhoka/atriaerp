-- ============================================================================
-- AtriaERP — Supabase database setup
-- Run this ONCE in your Supabase project:  Dashboard → SQL Editor → New query →
-- paste everything → Run.
-- ============================================================================

-- 1) Tables -------------------------------------------------------------------
create table if not exists public.companies (
  id   text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id         text primary key,
  company_id text,
  data       jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.records (
  id         text primary key,
  entity     text not null,
  company_id text,
  project_id text,
  data       jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists records_entity_idx  on public.records (entity);
create index if not exists records_company_idx on public.records (company_id);

-- 2) User profiles (role per user) -------------------------------------------
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text,
  full_name text,
  role      text not null default 'admin',   -- admin | manager | sales | accounts | site | legal
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Row Level Security -------------------------------------------------------
-- v1 policy: any LOGGED-IN user can read/write org data; anonymous users get nothing.
-- (Tighten later to per-company access if you onboard external parties.)
alter table public.companies enable row level security;
alter table public.projects  enable row level security;
alter table public.records   enable row level security;
alter table public.profiles  enable row level security;

drop policy if exists "auth all companies" on public.companies;
drop policy if exists "auth all projects"  on public.projects;
drop policy if exists "auth all records"   on public.records;
create policy "auth all companies" on public.companies for all to authenticated using (true) with check (true);
create policy "auth all projects"  on public.projects  for all to authenticated using (true) with check (true);
create policy "auth all records"   on public.records   for all to authenticated using (true) with check (true);

-- Profiles: a user can read all profiles (to show names) but only edit their own;
-- admins can edit anyone.
drop policy if exists "read profiles"   on public.profiles;
drop policy if exists "update own/admin" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own/admin" on public.profiles for update to authenticated
  using (id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')));

-- ============================================================================
-- Done. Next: create your users under Authentication → Users (or let them sign
-- up), then set each person's role in the `profiles` table, e.g.:
--   update public.profiles set role = 'accounts' where email = 'ramesh@youco.com';
-- Roles: admin, manager, sales, accounts, site, legal
-- ============================================================================
