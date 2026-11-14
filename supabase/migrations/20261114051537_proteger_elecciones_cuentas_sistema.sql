begin;
set local lock_timeout='5s';
select pg_advisory_xact_lock(20261113,40);

-- Account-to-participant links and the owner flag are server-managed. In
-- particular, neither profile roles nor editable user metadata grant ownership.
create table public.mesa_cuentas_sistema (
  user_id uuid primary key references auth.users(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete restrict,
  es_owner boolean not null default false
);
create index mesa_cuentas_perfil_idx on public.mesa_cuentas_sistema(perfil_id);
alter table public.mesa_cuentas_sistema enable row level security;
create policy "Consultar cuentas protegidas" on public.mesa_cuentas_sistema for select to authenticated
  using ((select auth.uid()) is not null);
revoke all on public.mesa_cuentas_sistema from public,anon,authenticated;
grant select on public.mesa_cuentas_sistema to authenticated;
insert into public.mesa_cuentas_sistema(user_id,perfil_id)
  select u.id,p.id from auth.users u join public.perfiles p on p.id=u.id where p.es_participante;

create function public.puede_gestionar_familia_mesa(p_perfil_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select auth.uid() is not null and (
    not exists(select 1 from public.mesa_cuentas_sistema c where c.perfil_id=p_perfil_id)
    or exists(select 1 from public.mesa_cuentas_sistema c where c.user_id=auth.uid() and (c.es_owner or c.perfil_id=p_perfil_id))
  );
$$;
revoke all on function public.puede_gestionar_familia_mesa(uuid) from public,anon;
grant execute on function public.puede_gestionar_familia_mesa(uuid) to authenticated;

create function public.proteger_eleccion_mesa() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  -- Database operators and the service backend retain administrative access.
  if current_user in ('postgres','supabase_admin','service_role') then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name='salon_objetos' then
    if tg_op='UPDATE' then
      if (new.perfil_id,new.x,new.y,new.ancho,new.alto,new.nombre)
        is not distinct from (old.perfil_id,old.x,old.y,old.ancho,old.alto,old.nombre) then return new; end if;
      if old.tipo='mesa_extras' and (new.x,new.y,new.ancho,new.alto) is distinct from (old.x,old.y,old.ancho,old.alto)
        and exists(select 1 from public.mesa_asientos a where a.objeto_id=old.id and not public.puede_gestionar_familia_mesa(a.perfil_id)) then
        raise exception 'Esta mesa compartida incluye una eleccion protegida. Solo el owner puede moverla.';
      end if;
    end if;
  end if;
  if tg_op in ('UPDATE','DELETE') and not public.puede_gestionar_familia_mesa(old.perfil_id) then
    raise exception 'La eleccion de esta cuenta esta protegida. Solo su titular o el owner puede cambiarla.';
  end if;
  if tg_op in ('INSERT','UPDATE') and not public.puede_gestionar_familia_mesa(new.perfil_id) then
    raise exception 'Solo el titular de esta cuenta o el owner puede elegir su ubicacion.';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.proteger_eleccion_mesa() from public,anon;
create trigger proteger_eleccion_salon before insert or update or delete on public.salon_objetos
  for each row execute function public.proteger_eleccion_mesa();
create trigger proteger_eleccion_asiento before insert or update or delete on public.mesa_asientos
  for each row execute function public.proteger_eleccion_mesa();
commit;
