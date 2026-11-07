-- Tillsyno – databasens säkerhetsuppsättning som den ser ut i drift
-- Avläst ur Supabase-projektet "Tillsyno" (ref vczdugrwcivnotjltarm, region eu-central-1)
-- den 7 november 2026. Filen dokumenterar läget för granskning; den är ingen migration att köra.
-- Tidigare migrationer: auth/access-security.sql, auth/read-access.sql, auth/session-security.sql.
--
-- Sammanfattning
-- * public.tillsyno_access: roll, moduler och licenstid per konto. Inloggad användare får bara
--   LÄSA sin egen rad (RLS). Ingen klient får skriva; ändringar görs av serverfunktionen
--   tillsyno-admin med serviceroll efter kontroll av token, aktiv session och administratörsroll.
-- * public.tillsyno_module_codes: kodlås per modul. Klienter får läsa module_key, enabled och
--   updated_at; kolumnen pin_hash (bcrypt, kostnad 12) är inte läsbar för klienter.
-- * Kodkontroller görs i SECURITY DEFINER-funktioner i privata scheman med spärr efter 5 fel
--   under 15 minuter. Försökstabellerna är inte åtkomliga för klienter.
-- * Ingen tabell är åtkomlig för rollen anon. Inga kundritningar eller protokoll lagras i databasen.

------------------------------------------------------------------------------------------
-- public.tillsyno_access
------------------------------------------------------------------------------------------
create table public.tillsyno_access (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  access_role text not null check (access_role = any (array['admin','member'])),
  created_at timestamptz not null default now(),
  allowed_modules text[] not null default array['smartmatch','control','drawing']
    check (allowed_modules <@ array['smartmatch','control','drawing'] and array_position(allowed_modules, null::text) is null),
  license_expires_at timestamptz
);
alter table public.tillsyno_access enable row level security;
create policy tillsyno_access_own_read on public.tillsyno_access
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));
-- Behörigheter (se auth/access-security.sql):
revoke all on table public.tillsyno_access from anon;
revoke insert, update, delete, truncate, references, trigger on table public.tillsyno_access from authenticated;
grant select on table public.tillsyno_access to authenticated;

------------------------------------------------------------------------------------------
-- public.tillsyno_module_codes
------------------------------------------------------------------------------------------
create table public.tillsyno_module_codes (
  module_key text not null primary key check (module_key = any (array['read','control','project','drawing'])),
  enabled boolean not null default false,
  pin_hash text,
  updated_at timestamptz not null default now()
);
alter table public.tillsyno_module_codes enable row level security;
create policy "authenticated can read module code status" on public.tillsyno_module_codes
  as permissive for select to authenticated
  using (true);
-- Endast dessa kolumner är läsbara för klienter; pin_hash är det inte.
grant select (module_key, enabled, updated_at) on public.tillsyno_module_codes to authenticated;

create or replace function public.tillsyno_admin_set_module_code(p_module text, p_enabled boolean, p_pin text default null)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if p_module not in ('read','control','project','drawing') then
    raise exception 'invalid module';
  end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be four digits';
  end if;

  insert into public.tillsyno_module_codes(module_key,enabled,pin_hash,updated_at)
  values (
    p_module,
    p_enabled,
    case when p_pin is null then null else extensions.crypt(p_pin,extensions.gen_salt('bf',12)) end,
    clock_timestamp()
  )
  on conflict (module_key) do update
  set enabled=excluded.enabled,
      pin_hash=case when p_pin is null then public.tillsyno_module_codes.pin_hash else excluded.pin_hash end,
      updated_at=clock_timestamp();

  if p_enabled and not exists (
    select 1 from public.tillsyno_module_codes
    where module_key=p_module and pin_hash is not null
  ) then
    raise exception 'pin required when enabling';
  end if;
end;
$function$;
-- Körbar endast av serverrollen (anropas från tillsyno-admin):
revoke all on function public.tillsyno_admin_set_module_code(text, boolean, text) from public, anon, authenticated;
grant execute on function public.tillsyno_admin_set_module_code(text, boolean, text) to service_role;

------------------------------------------------------------------------------------------
-- tillsyno_code_private: kodkontroll för modulernas kodlås
------------------------------------------------------------------------------------------
create schema if not exists tillsyno_code_private;
grant usage on schema tillsyno_code_private to authenticated, service_role;

create table tillsyno_code_private.tillsyno_module_code_attempts (
  user_id uuid not null,
  module_key text not null check (module_key = any (array['read','control','project','drawing'])),
  failures integer not null default 0,
  window_start timestamptz not null default clock_timestamp(),
  locked_until timestamptz,
  primary key (user_id, module_key)
);
-- Inga tabellbehörigheter för anon/authenticated; tabellen nås bara via funktionen nedan.
-- (RLS är inte påslaget på denna tabell. Den är ändå inte åtkomlig för klienter.)

create or replace function tillsyno_code_private.verify_module_code(p_module text, p_pin text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  uid uuid := auth.uid();
  sid text := auth.jwt()->>'session_id';
  moment timestamptz := clock_timestamp();
  needed_module text;
  access_ok boolean := false;
  lock_enabled boolean := false;
  secret_hash text;
  attempt tillsyno_code_private.tillsyno_module_code_attempts%rowtype;
begin
  if p_module not in ('read','control','project','drawing') then
    return jsonb_build_object('ok',false,'reason','module');
  end if;

  if uid is null or not exists (
    select 1 from auth.sessions s
    where s.user_id=uid and s.id::text=sid and (s.not_after is null or s.not_after>moment)
  ) then
    return jsonb_build_object('ok',false,'reason','auth');
  end if;

  needed_module := case
    when p_module in ('read','project') then 'smartmatch'
    when p_module='control' then 'control'
    else 'drawing'
  end;

  select exists(
    select 1 from public.tillsyno_access a
    where a.user_id=uid
      and (
        a.access_role='admin'
        or (
          a.access_role='member'
          and needed_module=any(a.allowed_modules)
          and (a.license_expires_at is null or a.license_expires_at>moment)
        )
      )
  ) into access_ok;

  if not access_ok then
    return jsonb_build_object('ok',false,'reason','access');
  end if;

  select enabled,pin_hash into lock_enabled,secret_hash
  from public.tillsyno_module_codes
  where module_key=p_module;

  if coalesce(lock_enabled,false)=false then
    return jsonb_build_object('ok',true,'required',false);
  end if;

  if secret_hash is null then
    return jsonb_build_object('ok',false,'reason','unavailable');
  end if;

  insert into tillsyno_code_private.tillsyno_module_code_attempts(user_id,module_key)
  values(uid,p_module)
  on conflict do nothing;

  select * into attempt
  from tillsyno_code_private.tillsyno_module_code_attempts
  where user_id=uid and module_key=p_module
  for update;

  if attempt.locked_until>moment then
    return jsonb_build_object(
      'ok',false,'reason','locked',
      'retryAfter',ceil(extract(epoch from attempt.locked_until-moment))
    );
  end if;

  if attempt.window_start < moment-interval '15 minutes' then
    attempt.failures:=0;
    attempt.window_start:=moment;
  end if;

  if length(coalesce(p_pin,''))=4
     and p_pin ~ '^[0-9]{4}$'
     and extensions.crypt(p_pin,secret_hash)=secret_hash then
    update tillsyno_code_private.tillsyno_module_code_attempts
    set failures=0,window_start=moment,locked_until=null
    where user_id=uid and module_key=p_module;
    return jsonb_build_object('ok',true,'required',true);
  end if;

  attempt.failures:=attempt.failures+1;
  update tillsyno_code_private.tillsyno_module_code_attempts
  set failures=attempt.failures,
      window_start=attempt.window_start,
      locked_until=case when attempt.failures>=5 then moment+interval '15 minutes' else null end
  where user_id=uid and module_key=p_module;

  return jsonb_build_object(
    'ok',false,
    'reason',case when attempt.failures>=5 then 'locked' else 'code' end,
    'retryAfter',case when attempt.failures>=5 then 900 else 0 end
  );
end;
$function$;
revoke all on function tillsyno_code_private.verify_module_code(text, text) from public, anon;
grant execute on function tillsyno_code_private.verify_module_code(text, text) to authenticated;

create or replace function public.tillsyno_verify_module_code(p_module text, p_pin text)
returns jsonb language sql set search_path to '' as $function$
  select tillsyno_code_private.verify_module_code(p_module,p_pin);
$function$;
revoke all on function public.tillsyno_verify_module_code(text, text) from public, anon;
grant execute on function public.tillsyno_verify_module_code(text, text) to authenticated, service_role;

------------------------------------------------------------------------------------------
-- Kodlås för Avläsning (tillsyno_read_private) och sessionskontroll:
-- se auth/read-access.sql och auth/session-security.sql (oförändrade i drift).
------------------------------------------------------------------------------------------

------------------------------------------------------------------------------------------
-- Läge i Supabase Auth och säkerhetsrådgivaren (7 november 2026)
-- * 4 konton, alla med bekräftad e-post och godkänd behörighet, 1 administratör.
-- * Ingen tvåstegsverifiering (MFA) används.
-- * Säkerhetsrådgivaren: VARNING "Leaked Password Protection Disabled".
--   INFO: tabellerna i tillsyno_read_private har RLS utan policyer (avsiktligt: bara funktioner når dem).
-- * Serverfunktionen tillsyno-admin körs med verify_jwt=false (version 10; version 11 med
--   administratörsloggen driftsattes samma dag, se auth/admin-audit.sql); funktionen kontrollerar
--   själv token, aktiv session och administratörsroll (supabase/functions/tillsyno-admin/index.ts).
------------------------------------------------------------------------------------------
