create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger agents_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger calls_updated_at before update on public.calls for each row execute function public.set_updated_at();
create trigger follow_ups_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();
