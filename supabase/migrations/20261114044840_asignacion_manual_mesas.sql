begin;
set local lock_timeout = '5s';
select pg_advisory_xact_lock(20261113, 40);

alter table public.salon_objetos drop constraint salon_objetos_check;
alter table public.salon_objetos add constraint salon_familia_solo_en_mesa_familiar
  check (perfil_id is null or tipo='mesa_familiar');

-- Reset only the provisional seating layout requested by the organizer.
-- Family payments, extras, transfers and table coordinates remain intact.
delete from public.mesa_asientos;
update public.salon_objetos set perfil_id=null, version=version+1 where tipo='mesa_familiar';

create or replace function public.preparar_mesas_evento() returns void
language plpgsql security invoker set search_path = '' as $$
declare actuales integer; participantes integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  insert into public.mesas(perfil_id) select id from public.perfiles where es_participante on conflict do nothing;
  select count(*) into actuales from public.salon_objetos where tipo='mesa_familiar';
  select count(*) into participantes from public.perfiles where es_participante and activo;
  insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto)
    select 'mesa_familiar', 'Mesa ' || lpad(orden::text,2,'0'),
      case when floor((orden-1)/4.0)::integer%4 < 2 then 80 else 600 end
        + (floor((orden-1)/4.0)::integer%4)*660 + ((orden-1)%2)*340,
      400 + floor((orden-1)/16.0)*660 + (floor((orden-1)/2.0)::integer%2)*340, 180, 180
    from generate_series(actuales+1,participantes) orden;
  insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto)
    select 'mesa_extras', 'Extras ' || lpad((grupo+1)::text,2,'0'),
      case when grupo%4 < 2 then 250 else 770 end + (grupo%4)*660,
      570 + floor(grupo/4.0)*660, 180, 180
    from generate_series(
      (select count(*)::integer from public.salon_objetos where tipo='mesa_extras'),
      (select ceil(count(*)/4.0)::integer-1 from public.salon_objetos where tipo='mesa_familiar')
    ) grupo;
end;
$$;

create or replace function public.actualizar_mesa_evento(p_perfil_id uuid, p_version integer, p_extras integer, p_notas text)
returns void language plpgsql security invoker set search_path = '' as $$
declare ocupados integer; asiento record;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  delete from public.mesa_asientos where (objeto_id,posicion) in (
    select objeto_id,posicion from public.mesa_asientos where perfil_id=p_perfil_id
    order by objeto_id,posicion offset greatest(p_extras,0)
  );
  update public.mesas set extras_usados=p_extras, notas=p_notas, version=version+1, updated_at=now()
    where perfil_id=p_perfil_id and version=p_version;
  if not found then raise exception 'La familia cambio en otra sesion. Actualiza los datos e intenta de nuevo.'; end if;
  -- Extras can be paid before the physical table has been chosen.
  if not exists(select 1 from public.salon_objetos where perfil_id=p_perfil_id) then return; end if;
  select count(*) into ocupados from public.mesa_asientos where perfil_id=p_perfil_id;
  for asiento in
    select o.id, n.posicion from public.salon_objetos o
    cross join generate_series(1,8) n(posicion)
    join public.salon_objetos familiar on familiar.perfil_id=p_perfil_id
    where o.tipo='mesa_extras' and not exists (
      select 1 from public.mesa_asientos a where a.objeto_id=o.id and a.posicion=n.posicion
    )
    order by power(o.x+90+105*cos(radians(-157.5+(n.posicion-1)*45))-(familiar.x+90),2)
      + power(o.y+90+105*sin(radians(-157.5+(n.posicion-1)*45))-(familiar.y+90),2)
    limit greatest(p_extras-ocupados,0)
  loop
    insert into public.mesa_asientos(objeto_id,posicion,perfil_id) values(asiento.id,asiento.posicion,p_perfil_id);
    ocupados := ocupados+1;
  end loop;
  if ocupados < p_extras then raise exception 'Faltan asientos compartidos. Agrega una mesa de extras en el plano.'; end if;
end;
$$;

create function public.asignar_familia_mesa(p_objeto uuid, p_version integer, p_perfil_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare destino public.salon_objetos; origen public.salon_objetos; familia public.mesas;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  select * into destino from public.salon_objetos where id=p_objeto and tipo='mesa_familiar' and version=p_version for update;
  if not found then raise exception 'La mesa cambio en otra sesion. Actualiza los datos.'; end if;
  if destino.perfil_id is not distinct from p_perfil_id then return; end if;
  if p_perfil_id is not null then
    if not exists(select 1 from public.perfiles where id=p_perfil_id and es_participante and activo) then
      raise exception 'Elige un participante activo.';
    end if;
    select * into origen from public.salon_objetos where perfil_id=p_perfil_id for update;
  end if;
  delete from public.mesa_asientos where perfil_id=p_perfil_id or perfil_id=destino.perfil_id;
  update public.salon_objetos set perfil_id=null,version=version+1 where id=destino.id;
  if origen.id is not null then
    update public.salon_objetos set perfil_id=destino.perfil_id,version=version+1 where id=origen.id;
  end if;
  update public.salon_objetos set perfil_id=p_perfil_id where id=destino.id;
  for familia in select m.* from public.mesas m
    where (m.perfil_id=p_perfil_id or m.perfil_id=destino.perfil_id)
      and exists(select 1 from public.salon_objetos where perfil_id=m.perfil_id)
  loop
    perform public.actualizar_mesa_evento(familia.perfil_id,familia.version,familia.extras_usados,familia.notas);
  end loop;
  insert into public.audit_logs(action,entity_type,entity_id,summary,before_data,after_data)
    values('mesas.asignar_familia','mesa',destino.id::text,'Asignacion de familia a mesa del salon',
      jsonb_build_object('destino',to_jsonb(destino),'origen',to_jsonb(origen)),
      jsonb_build_object('destino',(select to_jsonb(o) from public.salon_objetos o where id=destino.id),
        'origen',(select to_jsonb(o) from public.salon_objetos o where id=origen.id)));
end;
$$;
revoke all on function public.asignar_familia_mesa(uuid,integer,uuid) from public, anon;
grant execute on function public.asignar_familia_mesa(uuid,integer,uuid) to authenticated;
commit;
