create or replace function public.realizar_canje(
  p_jugador_id uuid,
  p_premio_id uuid,
  p_cantidad integer default 1
)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_premio public.premios%rowtype;
  v_jugador public.jugadores%rowtype;
  v_total integer;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Solo administradores pueden realizar canjes';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  select * into v_premio
  from public.premios
  where id = p_premio_id
  for update;

  if not found then
    raise exception 'Premio no encontrado';
  end if;

  select * into v_jugador
  from public.jugadores
  where id = p_jugador_id
  for update;

  if not found then
    raise exception 'Jugador no encontrado';
  end if;

  if v_premio.stock < p_cantidad then
    raise exception 'Stock insuficiente';
  end if;

  v_total := v_premio.tickets * p_cantidad;

  if v_jugador.tickets < v_total then
    raise exception 'El jugador no tiene suficientes tickets';
  end if;

  update public.premios
  set stock = stock - p_cantidad
  where id = p_premio_id;

  perform pg_catalog.set_config('app.bypass_tickets_protection', 'on', true);

  update public.jugadores
  set tickets = tickets - v_total
  where id = p_jugador_id;

  perform pg_catalog.set_config('app.bypass_tickets_protection', 'off', true);

  insert into public.canjes (jugador_id, premio_id, cantidad, tickets_descontados)
  values (p_jugador_id, p_premio_id, p_cantidad, v_total);

  insert into public.tickets_movimientos (jugador_id, cantidad, motivo, descripcion)
  values (p_jugador_id, -v_total, 'canje', v_premio.nombre);

  return pg_catalog.json_build_object(
    'ok', true,
    'tickets_descontados', v_total,
    'stock_restante', v_premio.stock - p_cantidad,
    'saldo_restante', v_jugador.tickets - v_total
  );
end;
$function$;

revoke all on function public.realizar_canje(uuid, uuid, integer) from public, anon;
grant execute on function public.realizar_canje(uuid, uuid, integer) to authenticated;
