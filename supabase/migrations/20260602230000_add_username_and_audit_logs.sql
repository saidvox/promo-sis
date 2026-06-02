alter table public.perfiles
add column if not exists username text;

alter table public.perfiles
add constraint perfiles_username_format_check
check (username is null or username ~ '^[a-z0-9._-]{3,20}$');

create unique index if not exists perfiles_username_unique_idx
on public.perfiles (username)
where username is not null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.perfiles(id) on delete restrict,
  actor_username text not null,
  actor_display_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_id_idx
on public.audit_logs (actor_id);

create index if not exists audit_logs_action_idx
on public.audit_logs (action);

create index if not exists audit_logs_entity_idx
on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

create or replace function public.set_audit_log_actor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile public.perfiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to write audit logs';
  end if;

  select *
  into v_profile
  from public.perfiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Profile not found for audit actor';
  end if;

  new.actor_id := auth.uid();
  new.actor_username := coalesce(v_profile.username, 'sin-username');
  new.actor_display_name := coalesce(nullif(v_profile.nombre_completo, ''), v_profile.username, 'Usuario');
  new.created_at := coalesce(new.created_at, now());
  new.metadata := coalesce(new.metadata, '{}'::jsonb);

  return new;
end;
$$;

drop trigger if exists set_audit_log_actor_before_insert on public.audit_logs;
create trigger set_audit_log_actor_before_insert
before insert on public.audit_logs
for each row
execute function public.set_audit_log_actor();

drop policy if exists "Authenticated users can read audit logs" on public.audit_logs;
create policy "Authenticated users can read audit logs"
on public.audit_logs for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
create policy "Authenticated users can insert audit logs"
on public.audit_logs for insert
to authenticated
with check (actor_id = (select auth.uid()));
