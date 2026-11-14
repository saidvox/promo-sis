begin;
set local lock_timeout = '5s';

create table public.mesas (
  perfil_id uuid primary key references public.perfiles(id) on delete restrict,
  extras_usados integer not null default 0 check (extras_usados between 0 and 500),
  notas text not null default '' check (length(notas) <= 2000),
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.mesa_cesiones (
  id uuid primary key,
  origen_id uuid not null references public.mesas(perfil_id) on delete restrict,
  destino_id uuid not null references public.mesas(perfil_id) on delete restrict,
  cantidad integer not null check (cantidad between 1 and 500),
  anulada boolean not null default false,
  created_at timestamptz not null default now(),
  check (origen_id <> destino_id)
);
create index mesa_cesiones_origen_idx on public.mesa_cesiones(origen_id);
create index mesa_cesiones_destino_idx on public.mesa_cesiones(destino_id);

create table public.mesa_abonos (
  id uuid primary key,
  perfil_id uuid not null references public.mesas(perfil_id) on delete restrict,
  monto numeric(12,2) not null check (monto > 0),
  metodo text not null check (metodo in ('Efectivo', 'Yape', 'Plin', 'Transferencia')),
  referencia text not null default '' check (length(referencia) <= 200),
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);
create index mesa_abonos_perfil_idx on public.mesa_abonos(perfil_id);

create table public.salon_objetos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references public.mesas(perfil_id) on delete restrict,
  tipo text not null check (tipo in ('mesa_familiar', 'mesa_extras', 'zona')),
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  x numeric not null check (x between 0 and 5000),
  y numeric not null check (y between 0 and 5000),
  ancho numeric not null check (ancho between 80 and 4000),
  alto numeric not null check (alto between 80 and 4000),
  version integer not null default 0,
  check ((tipo = 'mesa_familiar') = (perfil_id is not null))
);

create table public.mesa_asientos (
  objeto_id uuid not null references public.salon_objetos(id) on delete restrict,
  posicion integer not null check (posicion between 1 and 8),
  perfil_id uuid not null references public.mesas(perfil_id) on delete restrict,
  primary key (objeto_id, posicion)
);
create index mesa_asientos_perfil_idx on public.mesa_asientos(perfil_id);

alter table public.mesas enable row level security;
alter table public.mesa_cesiones enable row level security;
alter table public.mesa_abonos enable row level security;
alter table public.salon_objetos enable row level security;
alter table public.mesa_asientos enable row level security;

create policy "Gestion de mesas autenticada" on public.mesas for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Gestion de cesiones autenticada" on public.mesa_cesiones for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Gestion de abonos autenticada" on public.mesa_abonos for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Gestion de plano autenticada" on public.salon_objetos for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Gestion de asientos autenticada" on public.mesa_asientos for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

revoke all on public.mesas, public.mesa_cesiones, public.mesa_abonos, public.salon_objetos, public.mesa_asientos from public, anon, authenticated;
grant select, insert, update on public.mesas, public.mesa_cesiones, public.mesa_abonos, public.salon_objetos to authenticated;
grant select, insert, update, delete on public.mesa_asientos to authenticated;

create view public.mesas_resumen with (security_invoker = true) as
select m.*,
  coalesce(c.cedidos, 0)::integer as cedidos,
  coalesce(r.recibidos, 0)::integer as recibidos,
  (2 + coalesce(r.recibidos, 0) - coalesce(c.cedidos, 0))::integer as cupos_extra,
  (2 + coalesce(r.recibidos, 0) - coalesce(c.cedidos, 0) - m.extras_usados)::integer as disponibles,
  (m.extras_usados * 40)::numeric as costo_extras,
  coalesce(a.abonado, 0)::numeric as abonado_extras,
  (m.extras_usados * 40 - coalesce(a.abonado, 0))::numeric as saldo_extras,
  coalesce(s.asignados, 0)::integer as asientos_asignados
from public.mesas m
left join (select origen_id, sum(cantidad) as cedidos from public.mesa_cesiones where not anulada group by origen_id) c on c.origen_id=m.perfil_id
left join (select destino_id, sum(cantidad) as recibidos from public.mesa_cesiones where not anulada group by destino_id) r on r.destino_id=m.perfil_id
left join (select perfil_id, sum(monto) as abonado from public.mesa_abonos where not anulado group by perfil_id) a on a.perfil_id=m.perfil_id
left join (select perfil_id, count(*) as asignados from public.mesa_asientos group by perfil_id) s on s.perfil_id=m.perfil_id;
revoke all on public.mesas_resumen from anon;
grant select on public.mesas_resumen to authenticated;

-- Todas las mutaciones se serializan antes de comprobar disponibilidad y saldos.
create function public.validar_mesas_evento() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20261113, 40);
  if exists (
    select 1 from public.mesas m join public.perfiles p on p.id=m.perfil_id
    where not p.es_participante
  ) then
    raise exception 'Las cuentas de solo acceso no pueden tener mesa.';
  end if;
  if exists (select 1 from public.mesas_resumen where disponibles < 0) then
    raise exception 'No hay suficientes cupos libres. Revisa los extras utilizados y las cesiones.';
  end if;
  if exists (select 1 from public.mesas_resumen where saldo_extras < 0) then
    raise exception 'Los abonos superan el costo de los extras. Anula el abono antes de reducirlos.';
  end if;
  if exists (select 1 from public.mesas_resumen where asientos_asignados > extras_usados) then
    raise exception 'Los asientos asignados superan los extras registrados de esa familia.';
  end if;
  if exists (select 1 from public.mesa_asientos a join public.salon_objetos o on o.id=a.objeto_id where o.tipo <> 'mesa_extras') then
    raise exception 'Los adicionales se sientan en las mesas compartidas de ocho.';
  end if;
  if tg_table_name='mesa_asientos' then
    update public.salon_objetos set version=version+1
      where id in ((to_jsonb(new)->>'objeto_id')::uuid, (to_jsonb(old)->>'objeto_id')::uuid);
  end if;
  return null;
end;
$$;
revoke all on function public.validar_mesas_evento() from public, anon;

create function public.proteger_historial_mesas() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'mesa_cesiones' then
    if (to_jsonb(new) - 'anulada') is distinct from (to_jsonb(old) - 'anulada') then
      raise exception 'Una cesion registrada solo se puede anular.';
    end if;
  elsif (to_jsonb(new) - 'anulado') is distinct from (to_jsonb(old) - 'anulado') then
    raise exception 'Un abono registrado solo se puede anular.';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_historial_mesas() from public, anon;
create trigger proteger_cesion before update on public.mesa_cesiones
  for each row execute function public.proteger_historial_mesas();
create trigger proteger_abono before update on public.mesa_abonos
  for each row execute function public.proteger_historial_mesas();

create function public.auditar_mesas_evento() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.audit_logs(action, entity_type, entity_id, summary, before_data, after_data)
    values (
      'mesas.' || tg_table_name || '.' || lower(tg_op), 'mesa',
      coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'perfil_id', to_jsonb(old)->>'perfil_id'),
      case tg_table_name
        when 'mesa_cesiones' then 'Registro de cesion de cupos adicionales'
        when 'mesa_abonos' then 'Registro de abono de invitados adicionales'
        else 'Actualizacion de mesa'
      end,
      case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
      case when tg_op='DELETE' then null else to_jsonb(new) end
    );
  end if;
  return null;
end;
$$;
revoke all on function public.auditar_mesas_evento() from public, anon;

create function public.preparar_mesas_evento() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  insert into public.mesas(perfil_id)
    select id from public.perfiles where es_participante on conflict do nothing;
  insert into public.salon_objetos(id, perfil_id, tipo, nombre, x, y, ancho, alto)
    select p.id, p.id, 'mesa_familiar', 'Mesa ' || lpad(orden::text, 2, '0'),
      case when floor((orden-1)/4.0)::integer%4 < 2 then 80 else 600 end
        + (floor((orden-1)/4.0)::integer%4)*660 + ((orden-1)%2)*340,
      400 + floor((orden-1)/16.0)*660 + (floor((orden-1)/2.0)::integer%2)*340, 180, 180
    from (select p.id, row_number() over(order by nombre_completo, id) as orden
          from public.perfiles p where es_participante and activo) p
    on conflict (perfil_id) do nothing;
end;
$$;

-- El plano inicial es una distribución editable, no una medición del local.
insert into public.mesas(perfil_id) select id from public.perfiles where es_participante;
insert into public.salon_objetos(id, perfil_id, tipo, nombre, x, y, ancho, alto)
select p.id, p.id, 'mesa_familiar', 'Mesa ' || lpad(orden::text, 2, '0'),
  case when floor((orden-1)/4.0)::integer%4 < 2 then 80 else 600 end
    + (floor((orden-1)/4.0)::integer%4)*660 + ((orden-1)%2)*340,
  400 + floor((orden-1)/16.0)*660 + (floor((orden-1)/2.0)::integer%2)*340, 180, 180
from (select id, row_number() over(order by nombre_completo, id) as orden
      from public.perfiles where es_participante and activo) p;
insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto)
select 'mesa_extras', 'Extras ' || lpad((grupo+1)::text,2,'0'),
  case when grupo%4 < 2 then 250 else 770 end + (grupo%4)*660,
  570 + floor(grupo/4.0)*660, 180, 180
from generate_series(0, greatest(0, (select ceil(count(*)/4.0)::integer-1 from public.perfiles where es_participante and activo))) grupo;
insert into public.salon_objetos(tipo,nombre,x,y,ancho,alto) values
  ('zona','Escenario',1400,120,440,160),
  ('zona','Pista de baile',1400,510,440,2400),
  ('zona','Ingreso',1460,3170,320,110),
  ('zona','Barra',3190,900,150,520),
  ('zona','Baños',3190,180,150,220);

create trigger validar_mesa after insert or update or delete on public.mesas
  for each row execute function public.validar_mesas_evento();
create trigger validar_cesion after insert or update or delete on public.mesa_cesiones
  for each row execute function public.validar_mesas_evento();
create trigger validar_abono after insert or update or delete on public.mesa_abonos
  for each row execute function public.validar_mesas_evento();
create trigger validar_asiento after insert or update or delete on public.mesa_asientos
  for each row execute function public.validar_mesas_evento();
create trigger auditar_mesa after update on public.mesas
  for each row execute function public.auditar_mesas_evento();
create trigger auditar_cesion after insert or update on public.mesa_cesiones
  for each row execute function public.auditar_mesas_evento();
create trigger auditar_abono after insert or update on public.mesa_abonos
  for each row execute function public.auditar_mesas_evento();
create trigger auditar_asiento after insert or update or delete on public.mesa_asientos
  for each row execute function public.auditar_mesas_evento();

create function public.actualizar_mesa_evento(p_perfil_id uuid, p_version integer, p_extras integer, p_notas text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ocupados integer;
  asiento record;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  delete from public.mesa_asientos
    where (objeto_id,posicion) in (
      select objeto_id,posicion from public.mesa_asientos where perfil_id=p_perfil_id
      order by objeto_id,posicion offset greatest(p_extras,0)
    );
  update public.mesas set extras_usados=p_extras, notas=p_notas, version=version+1, updated_at=now()
    where perfil_id=p_perfil_id and version=p_version;
  if not found then raise exception 'La mesa cambio en otra sesion. Actualiza los datos e intenta de nuevo.'; end if;
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

create function public.asignar_asiento_mesa(p_objeto uuid, p_posicion integer, p_perfil_id uuid, p_version integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  update public.salon_objetos set version=version+1 where id=p_objeto and version=p_version and tipo='mesa_extras';
  if not found then raise exception 'La mesa cambio en otra sesion. Actualiza los datos.'; end if;
  delete from public.mesa_asientos where objeto_id=p_objeto and posicion=p_posicion;
  if p_perfil_id is not null then
    insert into public.mesa_asientos(objeto_id,posicion,perfil_id) values(p_objeto,p_posicion,p_perfil_id);
  end if;
end;
$$;

create function public.crear_mesa_compartida(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  insert into public.salon_objetos(id,tipo,nombre,x,y,ancho,alto)
  values(p_id,'mesa_extras','Extras adicional',1900,3000,180,180) on conflict do nothing;
end;
$$;

create function public.ceder_cupos_mesa(p_id uuid, p_origen uuid, p_destino uuid, p_cantidad integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare existente public.mesa_cesiones;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  select * into existente from public.mesa_cesiones where id=p_id;
  if found then
    if existente.origen_id=p_origen and existente.destino_id=p_destino
       and existente.cantidad=p_cantidad and not existente.anulada then return; end if;
    raise exception 'La solicitud ya fue utilizada con otros datos.';
  end if;
  if not exists(select 1 from public.perfiles where id=p_origen and es_participante and activo)
     or not exists(select 1 from public.perfiles where id=p_destino and es_participante and activo) then
    raise exception 'Ambas personas deben ser participantes activos.';
  end if;
  insert into public.mesa_cesiones(id,origen_id,destino_id,cantidad) values(p_id,p_origen,p_destino,p_cantidad);
end;
$$;

create function public.registrar_abono_mesa(p_id uuid, p_perfil_id uuid, p_monto numeric, p_metodo text, p_referencia text)
returns void language plpgsql security invoker set search_path = '' as $$
declare existente public.mesa_abonos;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  if p_monto <> round(p_monto,2) then raise exception 'Usa como maximo dos decimales.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  select * into existente from public.mesa_abonos where id=p_id;
  if found then
    if existente.perfil_id=p_perfil_id and existente.monto=p_monto and existente.metodo=p_metodo
       and existente.referencia=p_referencia and not existente.anulado then return; end if;
    raise exception 'La solicitud ya fue utilizada con otros datos.';
  end if;
  insert into public.mesa_abonos(id,perfil_id,monto,metodo,referencia)
    values(p_id,p_perfil_id,p_monto,p_metodo,p_referencia);
end;
$$;

create function public.anular_registro_mesa(p_tipo text, p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  perform pg_advisory_xact_lock(20261113, 40);
  if p_tipo='abono' then
    update public.mesa_abonos set anulado=true where id=p_id and not anulado;
  elsif p_tipo='cesion' then
    update public.mesa_cesiones set anulada=true where id=p_id and not anulada;
  else raise exception 'Tipo de registro no valido.'; end if;
end;
$$;

create function public.guardar_objeto_salon(p_id uuid, p_version integer, p_x numeric, p_y numeric, p_nombre text, p_ancho numeric, p_alto numeric)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  update public.salon_objetos set x=p_x, y=p_y, nombre=p_nombre, ancho=p_ancho, alto=p_alto, version=version+1
    where id=p_id and version=p_version;
  if not found then raise exception 'La posicion cambio en otra sesion. Actualiza antes de moverla de nuevo.'; end if;
end;
$$;

revoke all on function public.preparar_mesas_evento(),
  public.asignar_asiento_mesa(uuid,integer,uuid,integer),
  public.crear_mesa_compartida(uuid),
  public.actualizar_mesa_evento(uuid,integer,integer,text),
  public.ceder_cupos_mesa(uuid,uuid,uuid,integer),
  public.registrar_abono_mesa(uuid,uuid,numeric,text,text),
  public.anular_registro_mesa(text,uuid),
  public.guardar_objeto_salon(uuid,integer,numeric,numeric,text,numeric,numeric)
from public, anon;
grant execute on function public.preparar_mesas_evento(),
  public.asignar_asiento_mesa(uuid,integer,uuid,integer),
  public.crear_mesa_compartida(uuid),
  public.actualizar_mesa_evento(uuid,integer,integer,text),
  public.ceder_cupos_mesa(uuid,uuid,uuid,integer),
  public.registrar_abono_mesa(uuid,uuid,numeric,text,text),
  public.anular_registro_mesa(text,uuid),
  public.guardar_objeto_salon(uuid,integer,numeric,numeric,text,numeric,numeric)
to authenticated;

commit;
