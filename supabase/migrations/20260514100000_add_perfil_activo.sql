begin;

alter table public.perfiles
  add column if not exists activo boolean not null default true;

create index if not exists perfiles_activo_idx
  on public.perfiles(activo);

commit;
