begin;

set local lock_timeout = '5s';

alter table public.perfiles
  add column es_participante boolean not null default true;

comment on column public.perfiles.es_participante is
  'Incluye al perfil en el padrón de participantes, las cuotas y las metas de recaudación.';

-- Los perfiles creados durante el primer ingreso usan un código derivado de su cuenta.
-- Conserva como participantes los perfiles con historial financiero o de actividades.
update public.perfiles as perfil
set es_participante = false
where perfil.codigo_u = 'AUTH-' || upper(left(perfil.id::text, 8))
  and exists (select 1 from auth.users as cuenta where cuenta.id = perfil.id)
  and not exists (select 1 from public.inscripciones as registro where registro.perfil_id = perfil.id)
  and not exists (select 1 from public.pagos as registro where registro.perfil_id = perfil.id)
  and not exists (select 1 from public.pago_movimientos as registro where registro.perfil_id = perfil.id)
  and not exists (select 1 from public.egresos as registro where registro.perfil_id = perfil.id)
  and not exists (select 1 from public.actividad_participantes as registro where registro.perfil_id = perfil.id);

commit;
