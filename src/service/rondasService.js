import { supabase } from "../supabase"

export const guardarRonda = async (evento_id, ronda, opciones = {}) => {
  const { forzarReemplazoFinalizada = false } = opciones

  // 🚫 validar ronda activa
  const { data: activa } = await supabase
    .from("rondas")
    .select("*")
    .eq("evento_id", evento_id)
    .eq("status", "activa")

  if (activa.length > 0 && ronda.stage === "2") {
    if (activa[0].numero_ronda !== ronda.numero) {
      throw new Error("Ya existe una ronda activa")
    }
  }

  // 🔍 VALIDAR JUGADORES ANTES DE INSERTAR
  const ids = new Set()
  ronda.matches.forEach(m => {
    if (m.jugador1_id) ids.add(m.jugador1_id)
    if (m.jugador2_id) ids.add(m.jugador2_id)
  })

  const idsArray = Array.from(ids)
  const { data: jugadoresDB } = await supabase
    .from("jugadores")
    .select("player_id")
    .in("player_id", idsArray)

  const existentes = new Set(jugadoresDB.map(j => j.player_id))
  const faltantes = idsArray.filter(id => id !== null && !existentes.has(id))

  if (faltantes.length > 0) {
    throw new Error(`Jugadores no registrados: ${faltantes.join(", ")}`)
  }

  // 🔁 reemplazar si es misma ronda
  const { data: existente } = await supabase
    .from("rondas")
    .select("id, status")
    .eq("evento_id", evento_id)
    .eq("numero_ronda", ronda.numero)

  if (existente.length > 0) {
    const rondaExistente = existente[0]
    if (rondaExistente.status === "finalizada" && !forzarReemplazoFinalizada) {
      throw new Error("CONFIRM_REPLACE_FINALIZADA")
    }

    const rondaId = existente[0].id
    await supabase.from("matches").delete().eq("ronda_id", rondaId)
    await supabase.from("rondas").delete().eq("id", rondaId)
  }

  // 🧠 status
  const todosConResultado = ronda.matches.every(m => m.outcome)
  const status = todosConResultado ? "finalizada" : "activa"

  const { data: rondaDB } = await supabase
    .from("rondas")
    .insert({
      numero_ronda: ronda.numero,
      status,
      evento_id,
    })
    .select()
    .single()

  const matchesInsert = ronda.matches.map(m => {
    let ganador = null
    let empate = false

    if (m.outcome === 1) ganador = m.jugador1_id  // 🔥 Corregido: number
    if (m.outcome === 2) ganador = m.jugador2_id
    if (m.outcome === 3) empate = true

    const esBye = m.jugador2_id === null || m.jugador2_id === undefined
    if (esBye && !ganador) {
      ganador = m.jugador1_id
    }

    return {
      ronda_id: rondaDB.id,
      mesa: m.mesa,
      jugador1_id: m.jugador1_id,
      jugador2_id: m.jugador2_id,
      ganador_final: ganador,
      empate: empate,
      confirmado: esBye || ganador !== null || empate,
      evento_id,
    }
  })

  await supabase.from("matches").insert(matchesInsert)
}
