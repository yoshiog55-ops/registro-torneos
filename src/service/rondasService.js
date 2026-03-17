import { supabase } from "../supabase"

export const guardarRonda = async (torneo_id, ronda) => {

  // 🚫 validar ronda activa
  const { data: activa } = await supabase
    .from("rondas")
    .select("*")
    .eq("torneo_id", torneo_id)
    .eq("status", "activa")

  if(activa.length > 0 && ronda.stage === "2"){
    // permitir solo si es la misma ronda (para reemplazar)
    if(activa[0].numero_ronda !== ronda.numero){
      throw new Error("Ya existe una ronda activa")
    }
  }

  // 🔍 VALIDAR JUGADORES ANTES DE INSERTAR
  const ids = new Set()

  ronda.matches.forEach(m => {
    if(m.jugador1_id) ids.add(m.jugador1_id)
    if(m.jugador2_id) ids.add(m.jugador2_id)
  })

  const idsArray = Array.from(ids)

  const { data: jugadoresDB } = await supabase
    .from("jugadores")
    .select("player_id")
    .in("player_id", idsArray)

  const existentes = new Set(jugadoresDB.map(j => j.player_id))

  const faltantes = idsArray.filter(id => !existentes.has(id))

  // 🚨 SI FALTAN → BLOQUEAR TODO
  if(faltantes.length > 0){
    throw new Error(
      `Jugadores no registrados: ${faltantes.join(", ")}`
    )
  }

  // 🔁 reemplazar si es misma ronda
  const { data: existente } = await supabase
    .from("rondas")
    .select("id")
    .eq("torneo_id", torneo_id)
    .eq("numero_ronda", ronda.numero)

  if(existente.length > 0){

    const rondaId = existente[0].id

    await supabase
      .from("matches")
      .delete()
      .eq("ronda_id", rondaId)

    await supabase
      .from("rondas")
      .delete()
      .eq("id", rondaId)
  }

  // 🧠 status
const todosConResultado = ronda.matches.every(m => m.outcome)

const status = todosConResultado ? "finalizada" : "activa"

  const { data: rondaDB } = await supabase
    .from("rondas")
    .insert({
      torneo_id,
      numero_ronda: ronda.numero,
      status
    })
    .select()
    .single()

  const matchesInsert = ronda.matches.map(m => {

    let ganador = null
    let empate = false

    if(m.outcome === "1") ganador = m.jugador1_id
    if(m.outcome === "2") ganador = m.jugador2_id
    if(m.outcome === "3") empate = true
    return {
 ronda_id: rondaDB.id,
  mesa: m.mesa,
  jugador1_id: m.jugador1_id,
  jugador2_id: m.jugador2_id,
  ganador_final: ganador,
  empate: empate, // 🔥 AQUÍ
  confirmado: ganador !== null || empate
    }
  })

  await supabase.from("matches").insert(matchesInsert)
}