begin;

create or replace function public.es_super_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

commit;
