-- AIBOT initial multi-tenant schema
create extension if not exists pgcrypto;

create type public.lead_status as enum (
  'NEW','QUEUED','CALLING','CONTACTED','NO_ANSWER','FAILED',
  'QUALIFIED','NOT_INTERESTED','FOLLOW_UP','COMPLETED'
);

create type public.lead_source as enum ('MANUAL','CSV','EXCEL','META','WEBSITE','CRM');
create type public.campaign_status as enum ('DRAFT','READY','RUNNING','PAUSED','COMPLETED','CANCELLED');
create type public.call_status as enum ('QUEUED','RINGING','IN_PROGRESS','COMPLETED','NO_ANSWER','FAILED','CANCELLED');
create type public.call_outcome as enum ('CONNECTED','NO_ANSWER','BUSY','FAILED','QUALIFIED','NOT_INTERESTED','FOLLOW_UP');
create type public.follow_up_channel as enum ('WHATSAPP','PHONE','EMAIL');
create type public.follow_up_status as enum ('PENDING','SENT','FAILED','CANCELLED','COMPLETED');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  company_name text,
  purpose text,
  instructions text,
  business_context text,
  voice_provider text,
  voice_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text,
  phone text not null,
  email text,
  company text,
  source lead_source not null default 'MANUAL',
  status lead_status not null default 'NEW',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_workspace_status_idx on public.leads(workspace_id, status);
create index leads_workspace_created_idx on public.leads(workspace_id, created_at desc);
create index leads_workspace_phone_idx on public.leads(workspace_id, phone);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  name text not null,
  status campaign_status not null default 'DRAFT',
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  whatsapp_fallback_enabled boolean not null default false,
  whatsapp_fallback_delay_minutes integer not null default 10 check (whatsapp_fallback_delay_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_leads (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (campaign_id, lead_id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  provider text,
  provider_call_id text,
  phone_number text not null,
  status call_status not null default 'QUEUED',
  outcome call_outcome,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_url text,
  transcript text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_call_id)
);
create index calls_workspace_created_idx on public.calls(workspace_id, created_at desc);
create index calls_lead_idx on public.calls(lead_id, created_at desc);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  channel follow_up_channel not null,
  status follow_up_status not null default 'PENDING',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  message_template text,
  provider text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities(lead_id, created_at desc);

-- Basic updated_at helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger agents_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger calls_updated_at before update on public.calls for each row execute function public.set_updated_at();
create trigger follow_ups_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();

-- Row Level Security.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.agents enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.calls enable row level security;
alter table public.follow_ups enable row level security;
alter table public.lead_activities enable row level security;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = auth.uid()
  );
$$;

create policy workspace_members_read on public.workspace_members for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy workspace_read on public.workspaces for select using (public.is_workspace_member(id));
create policy workspace_update on public.workspaces for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid() and wm.role in ('owner','admin')));

create policy agents_all on public.agents for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy leads_all on public.leads for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy campaigns_all on public.campaigns for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy campaign_leads_all on public.campaign_leads for all using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id)));
create policy calls_all on public.calls for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy follow_ups_all on public.follow_ups for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy lead_activities_all on public.lead_activities for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
