do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles'
      and policyname = 'Authenticated users can read own profile'
  ) then
    create policy "Authenticated users can read own profile"
    on public.perfiles for select
    to authenticated
    using (id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles'
      and policyname = 'Authenticated users can insert own profile'
  ) then
    create policy "Authenticated users can insert own profile"
    on public.perfiles for insert
    to authenticated
    with check (id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles'
      and policyname = 'Authenticated users can update own profile'
  ) then
    create policy "Authenticated users can update own profile"
    on public.perfiles for update
    to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));
  end if;
end;
$$;
