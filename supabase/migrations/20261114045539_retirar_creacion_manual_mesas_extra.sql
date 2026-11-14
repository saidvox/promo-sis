begin;
-- Shared tables are sized automatically with the physical layout.
-- The manual creation action is no longer part of the organizer interface.
drop function public.crear_mesa_compartida(uuid);
commit;
