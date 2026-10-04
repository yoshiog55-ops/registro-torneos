-- Ejecutar en Supabase SQL Editor antes de desplegar el retiro de jugadores.
begin;

alter table public.inscripciones
  add column if not exists retirado boolean not null default false;

commit;
