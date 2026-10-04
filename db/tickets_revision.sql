-- =====================================================================
-- PARTE 1: DIAGNOSTICO (solo lectura). Ejecutar en Supabase > SQL Editor
-- y compartir los resultados antes de aplicar la PARTE 2.
-- =====================================================================

-- 1) Triggers sobre las tablas de tickets
select event_object_table as tabla, trigger_name, event_manipulation as evento,
       action_timing as momento, action_statement
from information_schema.triggers
where event_object_table in ('tickets_movimientos','jugadores','canjes','standings','matches')
order by tabla, trigger_name;

-- 2) Funciones relacionadas (incluye realizar_canje y las usadas por triggers)
select p.proname, pg_get_function_arguments(p.oid) as args,
       p.prosecdef as security_definer, pg_get_functiondef(p.oid) as definicion
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname ilike '%ticket%' or p.proname ilike '%canje%' or p.proname ilike '%movimiento%');

-- 3) RLS activo y politicas
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('tickets_movimientos','jugadores','canjes','premios');

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('tickets_movimientos','jugadores','canjes','premios');

-- 4) Columnas y constraints de tickets_movimientos (checks sobre "motivo", etc.)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'tickets_movimientos' order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid in ('public.tickets_movimientos'::regclass, 'public.jugadores'::regclass);

-- 5) Motivos que ya existen
select motivo, count(*), sum(cantidad) from public.tickets_movimientos group by motivo;

-- =====================================================================
-- PARTE 2: FUNCION asignar_tickets (aplicar SOLO tras revisar la PARTE 1)
-- Supone que NO hay trigger que sincronice jugadores.tickets desde
-- tickets_movimientos. Si lo hay, quitar el UPDATE de jugadores.
-- Ajustar columnas/motivo segun los constraints del punto 4.
-- =====================================================================
/*
create or replace function public.asignar_tickets(
  p_jugador_id uuid, p_cantidad int, p_motivo text, p_descripcion text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_saldo int;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'Cantidad invalida'; end if;

  insert into tickets_movimientos (jugador_id, cantidad, motivo, descripcion)
  values (p_jugador_id, p_cantidad, p_motivo, p_descripcion);

  update jugadores set tickets = coalesce(tickets,0) + p_cantidad
  where id = p_jugador_id returning tickets into v_saldo;

  return jsonb_build_object('saldo', v_saldo);
end $$;

revoke all on function public.asignar_tickets(uuid,int,text,text) from public, anon;
grant execute on function public.asignar_tickets(uuid,int,text,text) to authenticated;
*/
