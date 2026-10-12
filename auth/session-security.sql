-- Server-only session check: revoked sessions cannot administer users with an old JWT.
grant select on table auth.sessions to service_role;
create or replace function public.tillsyno_session_active(_session_id uuid, _user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists(select 1 from auth.sessions where id = _session_id and user_id = _user_id); $$;
revoke all on function public.tillsyno_session_active(uuid, uuid) from public, anon, authenticated;
grant execute on function public.tillsyno_session_active(uuid, uuid) to service_role;
