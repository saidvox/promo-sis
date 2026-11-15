begin;
create or replace function public.preparar_mesas_evento() returns void
language plpgsql security invoker set search_path='' as $$
declare actuales integer; participantes integer; disponibles integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113,40);
  insert into public.mesas(perfil_id) select id from public.perfiles where es_participante on conflict do nothing;
  select count(*) into actuales from public.salon_objetos where tipo='mesa_familiar';
  select count(*) into participantes from public.perfiles p where p.es_participante and p.activo
    and exists(select 1 from public.inscripciones i where i.perfil_id=p.id);
  select count(*) into disponibles from public.salon_objetos o where o.tipo='mesa_familiar'
    and (o.perfil_id is null or exists(select 1 from public.perfiles p where p.id=o.perfil_id and p.es_participante and p.activo
      and exists(select 1 from public.inscripciones i where i.perfil_id=p.id)));
  insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto)
    select 'mesa_familiar','Mesa '||lpad(orden::text,2,'0'),
      case when floor((orden-1)/4.0)::integer%4<2 then 80 else 600 end
        +(floor((orden-1)/4.0)::integer%4)*660+((orden-1)%2)*340,
      400+floor((orden-1)/16.0)*660+(floor((orden-1)/2.0)::integer%2)*340,180,180
    from generate_series(actuales+1,actuales+greatest(0,participantes-disponibles)) orden;
  insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto)
    select 'mesa_extras','Extras '||lpad((grupo+1)::text,2,'0'),
      case when grupo%4<2 then 250 else 770 end+(grupo%4)*660,570+floor(grupo/4.0)*660,180,180
    from generate_series((select count(*)::integer from public.salon_objetos where tipo='mesa_extras'),ceil(participantes/4.0)::integer-1) grupo;
end;
$$;
create function public.validar_familia_inscrita() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.perfil_id is not null and not exists(select 1 from public.perfiles p where p.id=new.perfil_id and p.es_participante and p.activo
    and exists(select 1 from public.inscripciones i where i.perfil_id=p.id)) then
    raise exception 'Solo los participantes activos e inscritos pueden ocupar una mesa.';
  end if;
  return new;
end;
$$;
revoke all on function public.validar_familia_inscrita() from public,anon;
create trigger validar_familia_inscrita before insert or update of perfil_id on public.salon_objetos
  for each row execute function public.validar_familia_inscrita();
commit;
