begin;
set local lock_timeout = '5s';

alter table public.mesa_abonos
  add column voucher_path text,
  add column voucher_filename text,
  add column voucher_mime_type text,
  add column voucher_size bigint,
  add constraint mesa_abono_comprobante_valido check (
    (voucher_path is null and voucher_filename is null and voucher_mime_type is null and voucher_size is null)
    or (voucher_path is not null and voucher_filename is not null and voucher_mime_type is not null and voucher_size is not null
      and voucher_path like perfil_id::text || '/extras/' || id::text || '/%'
      and length(voucher_filename) between 1 and 200
      and voucher_mime_type in ('image/jpeg','image/png','image/webp')
      and voucher_size between 1 and 5242880)
  );

-- The original RPC remains available to older clients.
create function public.registrar_abono_mesa_con_comprobante(
  p_id uuid, p_perfil_id uuid, p_monto numeric, p_metodo text, p_referencia text,
  p_voucher_path text default null, p_voucher_filename text default null,
  p_voucher_mime_type text default null, p_voucher_size bigint default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare existente public.mesa_abonos; saldo numeric;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  if p_monto is null or p_monto::text in ('NaN','Infinity','-Infinity') or p_monto <= 0 or p_monto <> round(p_monto,2) then
    raise exception 'Ingresa un importe positivo con un maximo de dos decimales.';
  end if;
  perform pg_advisory_xact_lock(20261113, 40);
  select * into existente from public.mesa_abonos where id=p_id;
  if found then
    if existente.perfil_id=p_perfil_id and existente.monto=p_monto and existente.metodo=p_metodo
      and existente.referencia=p_referencia and not existente.anulado
      and existente.voucher_path is not distinct from p_voucher_path
      and existente.voucher_filename is not distinct from p_voucher_filename
      and existente.voucher_mime_type is not distinct from p_voucher_mime_type
      and existente.voucher_size is not distinct from p_voucher_size then return; end if;
    raise exception 'La solicitud ya fue utilizada con otros datos. Actualiza el historial.';
  end if;
  select saldo_extras into saldo from public.mesas_resumen where perfil_id=p_perfil_id;
  if saldo is null or p_monto > saldo then raise exception 'El importe supera el saldo pendiente de extras.'; end if;
  if p_voucher_path is not null and not exists (
    select 1 from storage.objects where bucket_id='payment-vouchers' and name=p_voucher_path
  ) then raise exception 'Primero adjunta la imagen del comprobante.'; end if;
  insert into public.mesa_abonos(id,perfil_id,monto,metodo,referencia,voucher_path,voucher_filename,voucher_mime_type,voucher_size)
    values(p_id,p_perfil_id,p_monto,p_metodo,p_referencia,p_voucher_path,p_voucher_filename,p_voucher_mime_type,p_voucher_size);
end;
$$;
revoke all on function public.registrar_abono_mesa_con_comprobante(uuid,uuid,numeric,text,text,text,text,text,bigint) from public, anon;
grant execute on function public.registrar_abono_mesa_con_comprobante(uuid,uuid,numeric,text,text,text,text,text,bigint) to authenticated;
commit;
