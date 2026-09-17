-- Demo requests captured by Zemo on the public site.
--
-- This is the one table an unauthenticated visitor may write to, so it is
-- locked down in the opposite direction from everything else in the schema:
-- insert is allowed, and nothing else is. No policy grants select, update or
-- delete to anon or authenticated, which means a visitor can drop a request in
-- but can never read anyone's back out. Requests are read in the Supabase
-- dashboard by a human, not by the application.

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  -- Where on the site the request came from, so an unusually productive page
  -- is visible without any tracking of the person.
  source_route text,
  note text,
  created_at timestamptz not null default now()
);

-- Cheap guards at the storage layer, so a malformed or abusive row cannot be
-- written even if the API route is bypassed.
alter table public.demo_requests
  drop constraint if exists demo_requests_name_len;
alter table public.demo_requests
  add constraint demo_requests_name_len check (char_length(name) between 1 and 120);

alter table public.demo_requests
  drop constraint if exists demo_requests_email_shape;
alter table public.demo_requests
  add constraint demo_requests_email_shape
  check (char_length(email) between 3 and 200 and position('@' in email) > 1);

alter table public.demo_requests
  drop constraint if exists demo_requests_company_len;
alter table public.demo_requests
  add constraint demo_requests_company_len check (company is null or char_length(company) <= 160);

alter table public.demo_requests
  drop constraint if exists demo_requests_phone_len;
alter table public.demo_requests
  add constraint demo_requests_phone_len check (phone is null or char_length(phone) <= 40);

alter table public.demo_requests
  drop constraint if exists demo_requests_note_len;
alter table public.demo_requests
  add constraint demo_requests_note_len check (note is null or char_length(note) <= 1000);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

alter table public.demo_requests enable row level security;

drop policy if exists demo_requests_insert on public.demo_requests;

-- Insert only. Deliberately no using-clause policy of any kind: with RLS on
-- and no select policy, every read returns zero rows for anon and
-- authenticated alike.
create policy demo_requests_insert on public.demo_requests
  for insert to anon, authenticated
  with check (true);

grant insert on public.demo_requests to anon, authenticated;
revoke select, update, delete on public.demo_requests from anon, authenticated;
