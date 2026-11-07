-- Applied as Supabase migration tillsyno_admin_audit (v2.4.575, 2026-11-07).
-- Administrator log: one row per completed change made through the tillsyno-admin function
-- (add, approve, update, extend, cancelLicense, delete, link, saveCodeSettings).
-- Only the server role can write or read it; the app reads it through the function's "audit" action.
-- Rows older than 365 days are removed by the function on each new entry.
-- Never stores passwords, module codes, invitation links or tokens.
create table if not exists public.tillsyno_admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text not null default '',
  action text not null check (action in ('add','approve','update','extend','cancelLicense','delete','link','saveCodeSettings')),
  target_id uuid,
  target_email text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists tillsyno_admin_audit_at_idx on public.tillsyno_admin_audit (at desc);
alter table public.tillsyno_admin_audit enable row level security;
revoke all on table public.tillsyno_admin_audit from public, anon, authenticated;
grant select, insert, delete on table public.tillsyno_admin_audit to service_role;
-- Migration tillsyno_admin_audit_append_only: entries cannot be changed through the API.
revoke update, truncate, references, trigger on table public.tillsyno_admin_audit from service_role;
comment on table public.tillsyno_admin_audit is 'Tillsyno administratörslogg: vem ändrade vilket konto eller kodlås och när. Sparas 365 dagar.';
