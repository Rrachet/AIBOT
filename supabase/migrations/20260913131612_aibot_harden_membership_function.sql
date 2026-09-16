create or replace function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.workspace_members wm where wm.workspace_id = target_workspace and wm.user_id = auth.uid()); $$;
revoke execute on function public.is_workspace_member(uuid) from anon, public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
