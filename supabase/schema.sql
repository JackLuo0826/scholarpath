-- ============================================================
-- ScholarPath — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Parent accounts (managed by Supabase Auth) ───────────────
-- Supabase Auth handles the auth.users table automatically.
-- We extend it with a profiles table.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  role        text not null check (role in ('parent', 'student')),
  created_at  timestamptz not null default now()
);

-- ── Children (owned by a parent) ────────────────────────────
create table if not exists public.children (
  id            uuid primary key default uuid_generate_v4(),
  parent_id     uuid not null references public.profiles(id) on delete cascade,
  -- auth_id links to the student's own Supabase Auth account (nullable: set when student account is created)
  auth_id       uuid unique references auth.users(id) on delete set null,
  name          text not null,
  age           int,
  grade         text,
  goal          text,
  target_year   int,
  avatar_color  text default '#6366f1',
  streak        int default 0,
  created_at    timestamptz not null default now()
);

-- Migration helper: run this if the table already exists without auth_id
-- alter table public.children add column if not exists auth_id uuid unique references auth.users(id) on delete set null;

-- ── Chat messages ────────────────────────────────────────────
-- Immutable log — no DELETE permission for any role
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references public.children(id) on delete cascade,
  sender      text not null check (sender in ('student', 'ai')),
  content     text not null,
  subject     text,
  created_at  timestamptz not null default now()
);

-- ── Daily tasks ──────────────────────────────────────────────
create table if not exists public.daily_tasks (
  id            uuid primary key default uuid_generate_v4(),
  child_id      uuid not null references public.children(id) on delete cascade,
  subject       text not null,
  subject_color text default '#6366f1',
  title         text not null,
  duration_min  int default 20,
  completed     boolean default false,
  type          text check (type in ('lesson', 'exercise', 'test', 'review')),
  scheduled_for date not null default current_date,
  created_at    timestamptz not null default now()
);

-- ── Knowledge items ──────────────────────────────────────────
create table if not exists public.knowledge_items (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references public.children(id) on delete cascade,
  subject     text not null,
  topic       text not null,
  concept     text not null,
  summary     text,
  mastery     text check (mastery in ('beginner', 'developing', 'confident')) default 'beginner',
  evidence    text,
  suggested_exercise text,
  analysed_at timestamptz not null default now()
);

-- ── Goal plan (WOOP) ────────────────────────────────────────
create table if not exists public.goal_plans (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references public.children(id) on delete cascade,
  plan_json   jsonb not null,
  created_at  timestamptz not null default now()
);

-- ── University path ──────────────────────────────────────────
create table if not exists public.university_paths (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references public.children(id) on delete cascade,
  path_json   jsonb not null,
  created_at  timestamptz not null default now()
);

-- ── Settings (per parent) ────────────────────────────────────
create table if not exists public.settings (
  parent_id   uuid primary key references public.profiles(id) on delete cascade,
  claude_model text default 'claude-opus-4-6',
  updated_at  timestamptz not null default now()
);

-- ── Weekly generated activity sets ──────────────────────────────────────────
create table if not exists public.weekly_activities (
  id           uuid primary key default uuid_generate_v4(),
  child_id     uuid not null references public.children(id) on delete cascade,
  week_start   date not null,
  week_theme   text not null default '',
  activities   jsonb not null,
  generated_at timestamptz not null default now(),
  unique(child_id, week_start)
);

-- ── Activity completions (student answers + AI feedback) ────────────────────
create table if not exists public.activity_completions (
  id            uuid primary key default uuid_generate_v4(),
  child_id      uuid not null references public.children(id) on delete cascade,
  activity_id   text not null,
  week_start    date not null,
  answer_text   text,
  answer_image  text,
  is_correct    boolean not null,
  score         int not null default 0,
  feedback      text not null default '',
  explanation   text not null default '',
  encouragement text not null default '',
  completed_at  timestamptz not null default now(),
  unique(child_id, activity_id, week_start)
);

-- ============================================================
-- Drop old/renamed policies before recreating (idempotent re-runs)
-- ============================================================
drop policy if exists "Insert chat messages"       on public.chat_messages;
drop policy if exists "Parent reads child messages" on public.chat_messages;
drop policy if exists "Parent inserts child messages" on public.chat_messages;
drop policy if exists "Student reads own messages"  on public.chat_messages;
drop policy if exists "Student inserts own messages" on public.chat_messages;
drop policy if exists "Own profile"                on public.profiles;
drop policy if exists "Parent owns children"       on public.children;
drop policy if exists "Student reads own row"      on public.children;
drop policy if exists "Parent manages tasks"       on public.daily_tasks;
drop policy if exists "Student reads own tasks"    on public.daily_tasks;
drop policy if exists "Parent owns knowledge"      on public.knowledge_items;
drop policy if exists "Parent owns goal plans"     on public.goal_plans;
drop policy if exists "Student reads own goal plan" on public.goal_plans;
drop policy if exists "Parent owns university paths" on public.university_paths;
drop policy if exists "Student reads own university path" on public.university_paths;
drop policy if exists "Own settings"               on public.settings;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.children        enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.daily_tasks     enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.goal_plans      enable row level security;
alter table public.university_paths enable row level security;
alter table public.settings        enable row level security;

-- Profiles: users can read/write their own profile
create policy "Own profile" on public.profiles
  for all using (auth.uid() = id);

-- Children: parent can manage their own children
create policy "Parent owns children" on public.children
  for all using (parent_id = auth.uid());

-- Children: student can read their own row (needed to resolve childId on login)
create policy "Student reads own row" on public.children
  for select using (auth_id = auth.uid());

-- Chat messages: parent can read all messages for their children
create policy "Parent reads child messages" on public.chat_messages
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

-- Chat messages: parent can insert messages for their children
create policy "Parent inserts child messages" on public.chat_messages
  for insert with check (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

-- Chat messages: student can read their own messages
create policy "Student reads own messages" on public.chat_messages
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- Chat messages: student can insert their own messages
create policy "Student inserts own messages" on public.chat_messages
  for insert with check (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- No DELETE policy on chat_messages — intentionally omitted for COPPA compliance

-- Daily tasks: parent manages, student reads
create policy "Parent manages tasks" on public.daily_tasks
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

create policy "Student reads own tasks" on public.daily_tasks
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- Knowledge items: parent owns
create policy "Parent owns knowledge" on public.knowledge_items
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

-- Goal plans: parent owns; student can read their own
create policy "Parent owns goal plans" on public.goal_plans
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

create policy "Student reads own goal plan" on public.goal_plans
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- University paths: parent owns; student can read their own
create policy "Parent owns university paths" on public.university_paths
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

create policy "Student reads own university path" on public.university_paths
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- Settings
create policy "Own settings" on public.settings
  for all using (parent_id = auth.uid());

-- ── Drop new policies before creating (idempotent) ──────────────────────────
drop policy if exists "Parent manages weekly activities"  on public.weekly_activities;
drop policy if exists "Student reads own weekly activities" on public.weekly_activities;
drop policy if exists "Student inserts own weekly activities" on public.weekly_activities;
drop policy if exists "Parent reads child completions"   on public.activity_completions;
drop policy if exists "Student manages own completions"  on public.activity_completions;

-- Weekly activities: parent full control; student can read + insert
alter table public.weekly_activities      enable row level security;
alter table public.activity_completions   enable row level security;

create policy "Parent manages weekly activities" on public.weekly_activities
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

create policy "Student reads own weekly activities" on public.weekly_activities
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

create policy "Student inserts own weekly activities" on public.weekly_activities
  for insert with check (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

-- Activity completions: student owns; parent can read
create policy "Student manages own completions" on public.activity_completions
  for all using (
    exists (select 1 from public.children c where c.id = child_id and c.auth_id = auth.uid())
  );

create policy "Parent reads child completions" on public.activity_completions
  for select using (
    exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
