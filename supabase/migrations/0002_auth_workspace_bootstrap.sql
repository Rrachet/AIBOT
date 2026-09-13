-- AIBOT auth bootstrap
-- Every new authenticated user receives a private workspace and owner membership.
-- This runs inside Postgres so workspace creation cannot be bypassed by the client.

create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  workspace_name text;
  base_slug text;
  workspace_slug text;
  suffix integer := 0;
begin
  workspace_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'workspace_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1),
    'My Workspace'
  );

  base_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'workspace'; end if;
  workspace_slug := base_slug;

  while exists (select 1 from public.workspaces where slug = workspace_slug) loop
    suffix := suffix + 1;
    workspace_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.workspaces (name, slug)
  values (workspace_name, workspace_slug)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function public.handle_new_user_workspace() from public;
grant execute on function public.handle_new_user_workspace() to supabase_auth_admin;

drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace
after insert on auth.users
for each row execute function public.handle_new_user_workspace();

-- Allow authenticated workspace owners/admins to create additional workspaces later.
create policy workspace_insert on public.workspaces
for insert to authenticated
with check (auth.uid() is not null);

-- Only existing members can create memberships for a workspace, and only owners/admins
-- can add members. The signup trigger above bypasses this through SECURITY DEFINER.
create policy workspace_members_insert on public.workspace_members
for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);

create policy workspace_members_update on public.workspace_members
for update to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);
