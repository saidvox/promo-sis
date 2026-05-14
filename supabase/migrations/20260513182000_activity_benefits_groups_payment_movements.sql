begin;

alter table public.actividades
  add column if not exists tipo_actividad text not null default 'venta_unidades',
  add column if not exists etiqueta_unidad text not null default 'unidades',
  add column if not exists precio_unitario numeric not null default 0,
  add column if not exists minimo_unidades_beneficio integer not null default 0,
  add column if not exists monto_promocion_unitario numeric not null default 0,
  add column if not exists monto_beneficio_unitario numeric not null default 0,
  add column if not exists usa_grupos boolean not null default false,
  add column if not exists usa_premios boolean not null default false,
  add column if not exists total_bruto numeric not null default 0,
  add column if not exists total_promocion numeric not null default 0,
  add column if not exists total_beneficio numeric not null default 0,
  add column if not exists total_premios_externos numeric not null default 0;

alter table public.actividades
  add constraint actividades_tipo_actividad_check
  check (tipo_actividad in ('venta_unidades', 'aporte_manual'))
  not valid;

alter table public.actividades validate constraint actividades_tipo_actividad_check;

create table if not exists public.actividad_grupos (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  nombre text not null,
  premio text,
  costo_premio numeric not null default 0,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.actividad_participantes (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  grupo_id uuid references public.actividad_grupos(id) on delete set null,
  unidades_vendidas numeric not null default 0,
  monto_bruto numeric not null default 0,
  monto_promocion numeric not null default 0,
  monto_beneficio numeric not null default 0,
  monto_beneficio_aplicado numeric not null default 0,
  monto_beneficio_pendiente numeric not null default 0,
  cuota_id uuid references public.config_cuotas(id) on delete set null,
  aporte_premio numeric not null default 0,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actividad_id, perfil_id)
);

create table if not exists public.pago_movimientos (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid references public.pagos(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  cuota_id uuid not null references public.config_cuotas(id) on delete cascade,
  actividad_id uuid references public.actividades(id) on delete set null,
  actividad_participante_id uuid references public.actividad_participantes(id) on delete set null,
  origen text not null default 'manual',
  monto numeric not null,
  nota text,
  created_at timestamptz not null default now(),
  constraint pago_movimientos_origen_check check (origen in ('manual', 'beneficio_actividad', 'ajuste')),
  constraint pago_movimientos_monto_check check (monto > 0)
);

alter table public.egresos
  add column if not exists actividad_id uuid references public.actividades(id) on delete set null,
  add column if not exists actividad_grupo_id uuid references public.actividad_grupos(id) on delete set null;

create index if not exists actividad_grupos_actividad_id_idx
  on public.actividad_grupos(actividad_id);

create index if not exists actividad_participantes_actividad_id_idx
  on public.actividad_participantes(actividad_id);

create index if not exists actividad_participantes_perfil_id_idx
  on public.actividad_participantes(perfil_id);

create index if not exists pago_movimientos_pago_id_idx
  on public.pago_movimientos(pago_id);

create index if not exists pago_movimientos_perfil_cuota_idx
  on public.pago_movimientos(perfil_id, cuota_id);

create index if not exists pago_movimientos_actividad_id_idx
  on public.pago_movimientos(actividad_id);

alter table public.actividad_grupos enable row level security;
alter table public.actividad_participantes enable row level security;
alter table public.pago_movimientos enable row level security;

create policy "Authenticated users can read actividad_grupos"
on public.actividad_grupos for select
to authenticated
using (true);

create policy "Authenticated users can insert actividad_grupos"
on public.actividad_grupos for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "Authenticated users can update actividad_grupos"
on public.actividad_grupos for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy "Authenticated users can delete actividad_grupos"
on public.actividad_grupos for delete
to authenticated
using ((select auth.uid()) is not null);

create policy "Authenticated users can read actividad_participantes"
on public.actividad_participantes for select
to authenticated
using (true);

create policy "Authenticated users can insert actividad_participantes"
on public.actividad_participantes for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "Authenticated users can update actividad_participantes"
on public.actividad_participantes for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy "Authenticated users can delete actividad_participantes"
on public.actividad_participantes for delete
to authenticated
using ((select auth.uid()) is not null);

create policy "Authenticated users can read pago_movimientos"
on public.pago_movimientos for select
to authenticated
using (true);

create policy "Authenticated users can insert pago_movimientos"
on public.pago_movimientos for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "Authenticated users can update pago_movimientos"
on public.pago_movimientos for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy "Authenticated users can delete pago_movimientos"
on public.pago_movimientos for delete
to authenticated
using ((select auth.uid()) is not null);

create trigger set_actividad_grupos_updated_at
before update on public.actividad_grupos
for each row
execute function public.handle_updated_at();

create trigger set_actividad_participantes_updated_at
before update on public.actividad_participantes
for each row
execute function public.handle_updated_at();

commit;
