-- Additional code check for the Avläsning entry. The code/hash is provisioned
-- separately in the private table; never commit it to public client assets.
create schema if not exists tillsyno_read_private;
revoke all on schema tillsyno_read_private from public, anon, authenticated;
grant usage on schema tillsyno_read_private to authenticated;
create table if not exists tillsyno_read_private.settings (
 id boolean primary key default true check (id), pin_hash text not null
);
create table if not exists tillsyno_read_private.attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 failures integer not null default 0, window_start timestamptz not null default now(),
 locked_until timestamptz
);
alter table tillsyno_read_private.settings enable row level security;
alter table tillsyno_read_private.attempts enable row level security;
revoke all on all tables in schema tillsyno_read_private from public, anon, authenticated;
create or replace function tillsyno_read_private.verify_code(p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); sid text := auth.jwt()->>'session_id';
 access_ok boolean; attempt tillsyno_read_private.attempts%rowtype;
 secret_hash text; moment timestamptz := clock_timestamp();
begin
 if uid is null or not exists(select 1 from auth.sessions s where s.user_id=uid and s.id::text=sid and (s.not_after is null or s.not_after>moment)) then
  return jsonb_build_object('ok',false,'reason','auth');
 end if;
 select exists(select 1 from public.tillsyno_access a where a.user_id=uid and (a.access_role='admin' or (a.access_role='member' and 'smartmatch'=any(a.allowed_modules) and (a.license_expires_at is null or a.license_expires_at>moment)))) into access_ok;
 if not access_ok then return jsonb_build_object('ok',false,'reason','access');end if;
 insert into tillsyno_read_private.attempts(user_id) values(uid) on conflict do nothing;
 select * into attempt from tillsyno_read_private.attempts where user_id=uid for update;
 if attempt.locked_until>moment then return jsonb_build_object('ok',false,'reason','locked','retryAfter',ceil(extract(epoch from attempt.locked_until-moment)));end if;
 if attempt.window_start<moment-interval '15 minutes' then attempt.failures:=0;attempt.window_start:=moment;end if;
 select pin_hash into secret_hash from tillsyno_read_private.settings where id=true;
 if secret_hash is null then return jsonb_build_object('ok',false,'reason','unavailable');end if;
 if length(coalesce(p_pin,''))=4 and p_pin ~ '^[0-9]{4}$' and extensions.crypt(p_pin,secret_hash)=secret_hash then
  update tillsyno_read_private.attempts set failures=0,window_start=moment,locked_until=null where user_id=uid;
  return jsonb_build_object('ok',true);
 end if;
 attempt.failures:=attempt.failures+1;
 update tillsyno_read_private.attempts set failures=attempt.failures,window_start=attempt.window_start,locked_until=case when attempt.failures>=5 then moment+interval '15 minutes' else null end where user_id=uid;
 return jsonb_build_object('ok',false,'reason',case when attempt.failures>=5 then 'locked' else 'code' end,'retryAfter',case when attempt.failures>=5 then 900 else 0 end);
end;
$$;
revoke all on function tillsyno_read_private.verify_code(text) from public, anon, authenticated;
grant execute on function tillsyno_read_private.verify_code(text) to authenticated;
create or replace function public.tillsyno_verify_read_code(p_pin text)
returns jsonb language sql volatile security invoker set search_path = '' as $$
 select tillsyno_read_private.verify_code(p_pin);
$$;
revoke all on function public.tillsyno_verify_read_code(text) from public, anon, authenticated;
grant execute on function public.tillsyno_verify_read_code(text) to authenticated;
notify pgrst, 'reload schema';
