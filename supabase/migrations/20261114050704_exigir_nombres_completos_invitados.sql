begin;
-- Keep pre-existing unfinished entries available for completion; all new writes
-- require both fields. No names are guessed or discarded by this migration.
alter table public.mesa_invitados add constraint invitado_nombre_completo
  check (length(btrim(nombres))>0 and length(btrim(apellidos))>0) not valid;
create function public.validar_nombre_invitado() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if length(btrim(new.nombres))=0 or length(btrim(new.apellidos))=0 then
    raise exception 'Completa los nombres y apellidos de cada invitado.';
  end if;
  return new;
end;
$$;
revoke all on function public.validar_nombre_invitado() from public,anon;
create trigger validar_nombre_invitado before insert or update on public.mesa_invitados
  for each row execute function public.validar_nombre_invitado();
commit;
