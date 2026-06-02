begin;

alter table public.pago_movimientos
  add column if not exists es_ajuste_historico boolean not null default false;

update public.pago_movimientos
set es_ajuste_historico = true
where origen = 'manual'
  and nota = 'Pago registrado previamente';

create or replace function public.registrar_abono_manual(
  p_movement_id uuid,
  p_perfil_id uuid,
  p_cuota_id uuid,
  p_monto numeric,
  p_nota text,
  p_created_at timestamptz,
  p_voucher_path text default null,
  p_voucher_filename text default null,
  p_voucher_mime_type text default null,
  p_voucher_size integer default null,
  p_voucher_uploaded_at timestamptz default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pago_id uuid;
  v_total_actual numeric;
  v_meta numeric;
  v_nuevo_total numeric;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para registrar abonos.';
  end if;

  if p_monto <= 0 then
    raise exception 'El monto del abono debe ser mayor a cero.';
  end if;

  select monto
  into v_meta
  from public.config_cuotas
  where id = p_cuota_id;

  if v_meta is null then
    raise exception 'La cuota indicada no existe.';
  end if;

  select id, monto_pagado
  into v_pago_id, v_total_actual
  from public.pagos
  where perfil_id = p_perfil_id
    and cuota_id = p_cuota_id
  for update;

  v_total_actual := coalesce(v_total_actual, 0);
  v_nuevo_total := v_total_actual + p_monto;

  if v_nuevo_total > v_meta then
    raise exception 'El abono supera la deuda restante.';
  end if;

  if v_pago_id is null then
    insert into public.pagos (perfil_id, cuota_id, monto_pagado, estado)
    values (
      p_perfil_id,
      p_cuota_id,
      v_nuevo_total,
      case when v_nuevo_total >= v_meta then 'Pagado'::public.estado_pago else 'Pendiente'::public.estado_pago end
    )
    returning id into v_pago_id;
  else
    update public.pagos
    set
      monto_pagado = v_nuevo_total,
      estado = case when v_nuevo_total >= v_meta then 'Pagado'::public.estado_pago else 'Pendiente'::public.estado_pago end,
      updated_at = now()
    where id = v_pago_id;
  end if;

  insert into public.pago_movimientos (
    id,
    pago_id,
    perfil_id,
    cuota_id,
    origen,
    monto,
    nota,
    created_at,
    voucher_path,
    voucher_filename,
    voucher_mime_type,
    voucher_size,
    voucher_uploaded_at
  )
  values (
    p_movement_id,
    v_pago_id,
    p_perfil_id,
    p_cuota_id,
    'manual',
    p_monto,
    p_nota,
    p_created_at,
    p_voucher_path,
    p_voucher_filename,
    p_voucher_mime_type,
    p_voucher_size,
    p_voucher_uploaded_at
  );

  return p_movement_id;
end;
$$;

create or replace function public.actualizar_abono_manual(
  p_movement_id uuid,
  p_monto numeric,
  p_nota text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_movement public.pago_movimientos%rowtype;
  v_total_actual numeric;
  v_meta numeric;
  v_nuevo_total numeric;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para actualizar abonos.';
  end if;

  if p_monto <= 0 then
    raise exception 'El monto del abono debe ser mayor a cero.';
  end if;

  select *
  into v_movement
  from public.pago_movimientos
  where id = p_movement_id
  for update;

  if not found or v_movement.origen <> 'manual' or v_movement.es_ajuste_historico then
    raise exception 'Este movimiento no se puede editar.';
  end if;

  select p.monto_pagado, c.monto
  into v_total_actual, v_meta
  from public.pagos p
  join public.config_cuotas c on c.id = p.cuota_id
  where p.id = v_movement.pago_id
  for update of p;

  if not found then
    raise exception 'El pago asociado no existe.';
  end if;

  v_nuevo_total := v_total_actual - v_movement.monto + p_monto;

  if v_nuevo_total <= 0 or v_nuevo_total > v_meta then
    raise exception 'El nuevo monto deja un total de pago invalido.';
  end if;

  update public.pago_movimientos
  set monto = p_monto, nota = p_nota
  where id = p_movement_id;

  update public.pagos
  set
    monto_pagado = v_nuevo_total,
    estado = case when v_nuevo_total >= v_meta then 'Pagado'::public.estado_pago else 'Pendiente'::public.estado_pago end,
    updated_at = now()
  where id = v_movement.pago_id;
end;
$$;

create or replace function public.eliminar_abono_manual(p_movement_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_movement public.pago_movimientos%rowtype;
  v_total_actual numeric;
  v_meta numeric;
  v_nuevo_total numeric;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para eliminar abonos.';
  end if;

  select *
  into v_movement
  from public.pago_movimientos
  where id = p_movement_id
  for update;

  if not found or v_movement.origen <> 'manual' or v_movement.es_ajuste_historico then
    raise exception 'Este movimiento no se puede eliminar.';
  end if;

  select p.monto_pagado, c.monto
  into v_total_actual, v_meta
  from public.pagos p
  join public.config_cuotas c on c.id = p.cuota_id
  where p.id = v_movement.pago_id
  for update of p;

  if not found then
    raise exception 'El pago asociado no existe.';
  end if;

  v_nuevo_total := greatest(0, v_total_actual - v_movement.monto);

  delete from public.pago_movimientos
  where id = p_movement_id;

  if v_nuevo_total = 0 then
    delete from public.pagos
    where id = v_movement.pago_id;
  else
    update public.pagos
    set
      monto_pagado = v_nuevo_total,
      estado = case when v_nuevo_total >= v_meta then 'Pagado'::public.estado_pago else 'Pendiente'::public.estado_pago end,
      updated_at = now()
    where id = v_movement.pago_id;
  end if;

  return v_movement.voucher_path;
end;
$$;

revoke all on function public.registrar_abono_manual(uuid, uuid, uuid, numeric, text, timestamptz, text, text, text, integer, timestamptz) from public, anon;
revoke all on function public.actualizar_abono_manual(uuid, numeric, text) from public, anon;
revoke all on function public.eliminar_abono_manual(uuid) from public, anon;

grant execute on function public.registrar_abono_manual(uuid, uuid, uuid, numeric, text, timestamptz, text, text, text, integer, timestamptz) to authenticated;
grant execute on function public.actualizar_abono_manual(uuid, numeric, text) to authenticated;
grant execute on function public.eliminar_abono_manual(uuid) to authenticated;

commit;
