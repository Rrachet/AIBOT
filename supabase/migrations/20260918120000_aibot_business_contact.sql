-- Business contact details for a workspace.
--
-- Configuration, not credentials: a phone number somebody types into Settings
-- so that outbound calling and WhatsApp have something to be configured with
-- later. No provider is connected, nothing is dialled, and nothing here is a
-- secret — which is why it sits on `workspaces` with the name rather than in a
-- separate table with its own policies.
--
-- Access is therefore whatever the workspace already had: `workspace_read` for
-- any member, `workspace_update` for owners and admins. Both already exist, so
-- adding columns changes no policy.
--
-- Every column is nullable. A workspace with nothing filled in is the normal
-- state, and an empty field is stored as NULL rather than an empty string so
-- "not set" has one representation.
alter table public.workspaces
  add column business_name text,
  add column business_phone text,
  add column whatsapp_number text,
  add column whatsapp_display_name text,
  add column default_country_code text,
  add column business_email text;

-- Lengths and the shape of a dialling code are guarded here as well as in the
-- API, because the API is not the only thing that can write to this table.
-- Anything finer than this (which numbers are reachable, whether the WhatsApp
-- number is registered) is a question for a provider, and no provider is
-- connected yet.
alter table public.workspaces
  add constraint workspaces_business_name_length check (business_name is null or char_length(business_name) <= 120),
  add constraint workspaces_business_phone_length check (business_phone is null or char_length(business_phone) <= 32),
  add constraint workspaces_whatsapp_number_length check (whatsapp_number is null or char_length(whatsapp_number) <= 32),
  add constraint workspaces_whatsapp_display_name_length check (whatsapp_display_name is null or char_length(whatsapp_display_name) <= 60),
  add constraint workspaces_business_email_length check (business_email is null or char_length(business_email) <= 200),
  add constraint workspaces_default_country_code_shape check (default_country_code is null or default_country_code ~ '^\+[1-9][0-9]{0,3}$');
