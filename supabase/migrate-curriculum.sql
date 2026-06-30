-- ============================================================
-- Migration: add curriculum_lessons table
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

drop policy if exists "Authenticated reads curriculum" on public.curriculum_lessons;

create table if not exists public.curriculum_lessons (
  id            uuid primary key default uuid_generate_v4(),
  curriculum    text not null,
  subject       text not null,
  subject_color text not null default '#6366f1',
  unit_number   int  not null,
  unit_title    text not null,
  lesson_number int  not null,
  title         text not null,
  description   text not null,
  content       text not null,
  question      text not null,
  hint          text not null,
  difficulty    text not null check (difficulty in ('foundation', 'developing', 'advanced')),
  duration_min  int  not null default 15,
  grade         text not null default 'Year 4',
  country       text not null default 'NZ',
  created_at    timestamptz not null default now(),
  unique(curriculum, unit_number, lesson_number)
);

alter table public.curriculum_lessons enable row level security;

create policy "Authenticated reads curriculum" on public.curriculum_lessons
  for select using (auth.role() = 'authenticated');
