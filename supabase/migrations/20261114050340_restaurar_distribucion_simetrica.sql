begin;
create function public.restaurar_distribucion_salon() returns void
language plpgsql security invoker set search_path='' as $$
declare anterior jsonb;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113,40);
  select jsonb_agg(jsonb_build_object('id',id,'x',x,'y',y)) into anterior from public.salon_objetos where tipo in ('mesa_familiar','mesa_extras');
  with orden as (
    select id,row_number() over(order by nullif(regexp_replace(nombre,'[^0-9]','','g'),'')::numeric nulls last,nombre,id) as numero
    from public.salon_objetos where tipo='mesa_familiar'
  ), posiciones as (
    select id,
      case when floor((numero-1)/4.0)::integer%4<2 then 80 else 600 end
        +(floor((numero-1)/4.0)::integer%4)*660+((numero-1)%2)*340 as x,
      400+floor((numero-1)/16.0)*660+(floor((numero-1)/2.0)::integer%2)*340 as y
    from orden
  ) update public.salon_objetos o set x=p.x,y=p.y,version=o.version+1 from posiciones p
    where o.id=p.id and (o.x,o.y) is distinct from (p.x,p.y);
  with orden as (
    select id,row_number() over(order by nullif(regexp_replace(nombre,'[^0-9]','','g'),'')::numeric nulls last,nombre,id)-1 as grupo
    from public.salon_objetos where tipo='mesa_extras'
  ), posiciones as (
    select id,case when grupo%4<2 then 250 else 770 end+(grupo%4)*660 as x,570+floor(grupo/4.0)*660 as y from orden
  ) update public.salon_objetos o set x=p.x,y=p.y,version=o.version+1 from posiciones p
    where o.id=p.id and (o.x,o.y) is distinct from (p.x,p.y);
  insert into public.audit_logs(action,entity_type,entity_id,summary,before_data,after_data)
    values('mesas.plano.restaurado','salon','distribucion','Restauro las posiciones simetricas de las mesas',anterior,
      (select jsonb_agg(jsonb_build_object('id',id,'x',x,'y',y)) from public.salon_objetos where tipo in ('mesa_familiar','mesa_extras')));
end;
$$;
revoke all on function public.restaurar_distribucion_salon() from public,anon;
grant execute on function public.restaurar_distribucion_salon() to authenticated;
commit;
