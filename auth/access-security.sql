-- Applied as Supabase migration restrict_tillsyno_access_writes.
-- Clients read only their own role through the existing RLS policy.
revoke all on table public.tillsyno_access from anon;
revoke insert, update, delete, truncate, references, trigger on table public.tillsyno_access from authenticated;
grant select on table public.tillsyno_access to authenticated;
