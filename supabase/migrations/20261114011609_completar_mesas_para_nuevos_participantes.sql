begin;

create or replace function public.preparar_mesas_evento() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  insert into public.mesas(perfil_id)
    select id from public.perfiles where es_participante on conflict do nothing;
  insert into public.salon_objetos(id, perfil_id, tipo, nombre, x, y, ancho, alto)
  select p.id, p.id, 'mesa_familiar', 'Mesa ' || lpad(orden::text,2,'0'),
    case when floor((orden-1)/4.0)::integer%4 < 2 then 80 else 600 end
      + (floor((orden-1)/4.0)::integer%4)*660 + ((orden-1)%2)*340,
    400 + floor((orden-1)/16.0)*660 + (floor((orden-1)/2.0)::integer%2)*340, 180, 180
  from (
    select p.id, row_number() over(order by nombre_completo,p.id)
      + (select count(*) from public.salon_objetos where tipo='mesa_familiar') as orden
    from public.perfiles p
    where p.es_participante and p.activo and not exists (
      select 1 from public.salon_objetos o where o.perfil_id=p.id
    )
  ) p;
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

commit;
