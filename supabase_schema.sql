-- Arewa Hausa CODM Community Competition Database Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- WARNING: This will drop old tables and reset all data!

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. Clean Up Old Schema
-- =========================================================================
drop table if exists public.final_leaderboard;
drop table if exists public.final_matches;
drop table if exists public.matches;
drop table if exists public.players;
drop table if exists public.tournament_state;
drop function if exists public.increment_leaderboard;

-- =========================================================================
-- 2. Tables Creation
-- =========================================================================

-- A. Tournament State
create table public.tournament_state (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
    updated_at timestamptz not null default now()
);

-- B. Players
create table public.players (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    seed integer not null check (seed >= 1 and seed <= 32),
    eliminated boolean not null default false,
    created_at timestamptz not null default now()
);

-- C. Matches (5-Round Single Elimination Tree)
create table public.matches (
    id uuid primary key default gen_random_uuid(),
    round integer not null check (round >= 1 and round <= 5),
    match_number integer not null check (match_number >= 1 and match_number <= 16),
    player1_id uuid references public.players(id) on delete set null,
    player2_id uuid references public.players(id) on delete set null,
    player1_name text,
    player2_name text,
    game1_p1_score integer,
    game1_p2_score integer,
    game2_p1_score integer,
    game2_p2_score integer,
    game3_p1_score integer,
    game3_p2_score integer,
    winner_id uuid references public.players(id) on delete set null,
    status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
    room_number integer check (room_number >= 1 and room_number <= 4),
    created_at timestamptz not null default now()
);

-- =========================================================================
-- 3. Row Level Security (RLS) Configuration
-- =========================================================================

-- Enable RLS on all tables
alter table public.tournament_state enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- Create Policies (Read access to everyone, write access to authenticated users)

-- tournament_state policies
create policy "Allow public read access on tournament_state" 
on public.tournament_state for select using (true);

create policy "Allow admin write access on tournament_state" 
on public.tournament_state for all to authenticated using (true) with check (true);

-- players policies
create policy "Allow public read access on players" 
on public.players for select using (true);

create policy "Allow admin write access on public players" 
on public.players for all to authenticated using (true) with check (true);

-- matches policies
create policy "Allow public read access on matches" 
on public.matches for select using (true);

create policy "Allow admin write access on matches" 
on public.matches for all to authenticated using (true) with check (true);

-- =========================================================================
-- 4. Supabase Realtime Replication Setup
-- =========================================================================

-- Enable realtime for our tables by adding them to the publication
do $$
begin
  alter publication supabase_realtime add table public.tournament_state;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when others then null;
end $$;

-- =========================================================================
-- 5. Seed Initial Data
-- =========================================================================

-- Insert one default row into tournament_state
insert into public.tournament_state (id, status)
values ('00000000-0000-0000-0000-000000000000', 'not_started')
on conflict (id) do nothing;
