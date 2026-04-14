begin;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Permitir eliminación" on public.abonos_egresos;
drop policy if exists "Permitir inserción" on public.abonos_egresos;

create policy "Authenticated users can insert abonos_egresos"
on public.abonos_egresos
for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "Authenticated users can delete abonos_egresos"
on public.abonos_egresos
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Enable all access for admins" on public.inscripciones;

create policy "Authenticated users can insert inscripciones"
on public.inscripciones
for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "Authenticated users can update inscripciones"
on public.inscripciones
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy "Authenticated users can delete inscripciones"
on public.inscripciones
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Avatars are public" on storage.objects;

commit;
