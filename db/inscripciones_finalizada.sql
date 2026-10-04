-- Permitir que un jugador se inscriba a otro evento el mismo dia una vez
-- que el anterior terminó (se suben sus standings).
-- Ejecutar en Supabase > SQL Editor, en una sola corrida.

begin;

alter table public.inscripciones
  add column if not exists finalizada boolean not null default false;

-- Eventos que ya tienen standings quedan finalizados
update public.inscripciones
set finalizada = true
where evento_id in (select distinct evento_id from public.standings where evento_id is not null);

-- Estas dos restricciones bloquean cualquier segunda inscripcion en el dia
alter table public.inscripciones drop constraint if exists jugador_torneo_fecha;
drop index if exists public.jugador_torneo_fecha;
drop index if exists public.unique_inscripcion_dia;

-- Un solo evento activo por jugador y dia
create unique index unique_inscripcion_activa_dia
  on public.inscripciones (jugador_id, fecha)
  where finalizada = false;

commit;
