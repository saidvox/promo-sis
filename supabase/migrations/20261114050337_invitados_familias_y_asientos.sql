begin;
set local lock_timeout = '5s';
select pg_advisory_xact_lock(20261113,40);

create table public.mesa_invitados (
  perfil_id uuid not null references public.mesas(perfil_id) on delete restrict,
  posicion integer not null check (posicion between 2 and 508),
  nombres text not null default '' check (length(nombres)<=100),
  apellidos text not null default '' check (length(apellidos)<=120),
  primary key(perfil_id,posicion),
  check (length(btrim(nombres || apellidos))>0)
);
create table public.mesa_invitados_versiones (
  perfil_id uuid primary key references public.mesas(perfil_id) on delete restrict,
  version integer not null default 0
);
alter table public.mesa_invitados enable row level security;
alter table public.mesa_invitados_versiones enable row level security;
create policy "Gestion de invitados autenticada" on public.mesa_invitados for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Versiones de invitados autenticadas" on public.mesa_invitados_versiones for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
revoke all on public.mesa_invitados,public.mesa_invitados_versiones from public,anon,authenticated;
grant select,insert,update,delete on public.mesa_invitados to authenticated;
grant select,insert,update on public.mesa_invitados_versiones to authenticated;

alter table public.mesa_asientos add column invitado_posicion integer check (invitado_posicion between 9 and 508);
with orden as (
  select objeto_id,posicion,8+row_number() over(partition by perfil_id order by objeto_id,posicion) as numero
  from public.mesa_asientos
)
update public.mesa_asientos a set invitado_posicion=o.numero from orden o where a.objeto_id=o.objeto_id and a.posicion=o.posicion;
create unique index mesa_asientos_invitado_unico on public.mesa_asientos(perfil_id,invitado_posicion);

create function public.validar_invitado_asiento() returns trigger
language plpgsql security invoker set search_path='' as $$
declare extras integer;
begin
  perform pg_advisory_xact_lock(20261113,40);
  select extras_usados into extras from public.mesas where perfil_id=new.perfil_id;
  if new.invitado_posicion is null then
    select numero into new.invitado_posicion from generate_series(9,8+extras) numero
    where not exists(select 1 from public.mesa_asientos a where a.perfil_id=new.perfil_id and a.invitado_posicion=numero
      and (a.objeto_id,a.posicion)<>(new.objeto_id,new.posicion)) order by numero limit 1;
  end if;
  if new.invitado_posicion is null or new.invitado_posicion>8+extras then raise exception 'No hay un cupo extra disponible para este invitado.'; end if;
  return new;
end;
$$;
revoke all on function public.validar_invitado_asiento() from public,anon;
create trigger validar_invitado_asiento before insert or update on public.mesa_asientos
  for each row execute function public.validar_invitado_asiento();

create function public.ajustar_cupos_invitados() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  delete from public.mesa_asientos where perfil_id=new.perfil_id and invitado_posicion>8+new.extras_usados;
  return null;
end;
$$;
revoke all on function public.ajustar_cupos_invitados() from public,anon;
create trigger ajustar_cupos_invitados after update of extras_usados on public.mesas
  for each row execute function public.ajustar_cupos_invitados();

create function public.guardar_invitados_mesa(p_perfil_id uuid,p_version integer,p_invitados jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare actual integer; limite integer; anteriores jsonb;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113,40);
  if jsonb_typeof(p_invitados) is distinct from 'array' or jsonb_array_length(p_invitados)>507 then raise exception 'La lista de invitados no es valida.'; end if;
  select coalesce(version,0) into actual from public.mesa_invitados_versiones where perfil_id=p_perfil_id;
  if coalesce(actual,0)<>p_version then raise exception 'La lista cambio en otra sesion. Actualiza antes de guardar.'; end if;
  select greatest(8+extras_usados,coalesce((select max(posicion) from public.mesa_invitados where perfil_id=p_perfil_id),8)) into limite
    from public.mesas where perfil_id=p_perfil_id;
  if limite is null then raise exception 'Este participante no tiene una familia registrada.'; end if;
  if exists(select 1 from jsonb_to_recordset(p_invitados) as i(posicion integer,nombres text,apellidos text)
    where posicion is null or posicion<2 or posicion>limite or length(coalesce(nombres,''))>100 or length(coalesce(apellidos,''))>120)
    or (select count(*)<>count(distinct posicion) from jsonb_to_recordset(p_invitados) as i(posicion integer)) then
    raise exception 'Revisa los nombres y los cupos disponibles de la familia.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(i) order by posicion),'[]') into anteriores from public.mesa_invitados i where perfil_id=p_perfil_id;
  delete from public.mesa_invitados where perfil_id=p_perfil_id and posicion in (select i.posicion from jsonb_to_recordset(p_invitados) as i(posicion integer));
  insert into public.mesa_invitados(perfil_id,posicion,nombres,apellidos)
    select p_perfil_id,posicion,btrim(coalesce(nombres,'')),btrim(coalesce(apellidos,''))
    from jsonb_to_recordset(p_invitados) as i(posicion integer,nombres text,apellidos text)
    where length(btrim(coalesce(nombres,'')||coalesce(apellidos,'')))>0;
  insert into public.mesa_invitados_versiones(perfil_id,version) values(p_perfil_id,1)
    on conflict(perfil_id) do update set version=public.mesa_invitados_versiones.version+1;
  insert into public.audit_logs(action,entity_type,entity_id,summary,before_data,after_data)
    values('mesas.invitados.guardados','mesa',p_perfil_id::text,'Actualizo la lista de familiares e invitados',anteriores,
      (select coalesce(jsonb_agg(to_jsonb(i) order by posicion),'[]') from public.mesa_invitados i where perfil_id=p_perfil_id));
end;
$$;

create function public.asignar_invitado_asiento_mesa(p_objeto uuid,p_posicion integer,p_perfil_id uuid,p_invitado_posicion integer,p_version integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  if p_perfil_id is null or p_invitado_posicion is null then raise exception 'Elige a un invitado de la familia.'; end if;
  perform pg_advisory_xact_lock(20261113,40);
  update public.salon_objetos set version=version+1 where id=p_objeto and version=p_version and tipo='mesa_extras';
  if not found then raise exception 'La mesa cambio en otra sesion. Actualiza los datos.'; end if;
  delete from public.mesa_asientos where (objeto_id=p_objeto and posicion=p_posicion)
    or (perfil_id=p_perfil_id and invitado_posicion=p_invitado_posicion);
  insert into public.mesa_asientos(objeto_id,posicion,perfil_id,invitado_posicion) values(p_objeto,p_posicion,p_perfil_id,p_invitado_posicion);
end;
$$;
revoke all on function public.guardar_invitados_mesa(uuid,integer,jsonb),public.asignar_invitado_asiento_mesa(uuid,integer,uuid,integer,integer) from public,anon;
grant execute on function public.guardar_invitados_mesa(uuid,integer,jsonb),public.asignar_invitado_asiento_mesa(uuid,integer,uuid,integer,integer) to authenticated;
commit;
