-- Per-person, per-workspace UI preferences. Currently just the product tour.
--
-- Deliberately a new table rather than a column on `workspace_members`. That
-- table has a read policy and no write policy; adding an update policy to it
-- would let a member write to their own membership row, and the obvious
-- implementation (`using (user_id = auth.uid())`) would let them set their own
-- `role` to 'owner'. A separate table carries nothing that can be escalated.
--
-- Scoped to (user_id, workspace_id) because the tour teaches a workspace: the
-- same person joining a second workspace has not seen that one yet.

create table if not exists public.user_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tour_state text not null default 'NOT_STARTED',
  -- Which step they reached, so a reload mid-tour picks up where they were.
  tour_step text,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

alter table public.user_preferences
  drop constraint if exists user_preferences_tour_state_valid;
alter table public.user_preferences
  add constraint user_preferences_tour_state_valid
  check (tour_state in ('NOT_STARTED', 'INTRO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'));

alter table public.user_preferences
  drop constraint if exists user_preferences_tour_step_len;
alter table public.user_preferences
  add constraint user_preferences_tour_step_len
  check (tour_step is null or char_length(tour_step) <= 64);

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_own on public.user_preferences;

-- Your own row, in a workspace you belong to. Both halves matter: `auth.uid()`
-- stops you reading anyone else's preferences, and the membership check stops
-- you writing a row against a workspace you are not in.
create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = auth.uid() and private.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and private.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.user_preferences to authenticated;
revoke all on public.user_preferences from anon;
