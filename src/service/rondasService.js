import { supabase } from "../supabase"
import { obtenerEventoActual } from "../utils/evento"
export const guardarRonda = async (torneo_id, ronda) => {

  // 🚫 validar ronda activa
const evento = await obtenerEventoActual(torneo_id)
  const { data: activa } = await supabase
    .from("rondas")
    .select("*")
    .eq("torneo_id", torneo_id)
    .eq("evento_id", evento.id)
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
    if(m.jugador2_id) ids.add(m.jugador2_id) // 🔥 null si es BYE
  })

  const idsArray = Array.from(ids)

  const { data: jugadoresDB } = await supabase
    .from("jugadores")
    .select("player_id")
    .in("player_id", idsArray)

  const existentes = new Set(jugadoresDB.map(j => j.player_id))

  // 🔥 IGNORA null EN LOS FALTANTES (byes)
  const faltantes = idsArray.filter(id => id !== null && !existentes.has(id))

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
    .eq("evento_id", evento.id)
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
      status,
      evento_id: evento.id,
    })
    .select()
    .single()

  const matchesInsert = ronda.matches.map(m => {

    let ganador = null
    let empate = false

    if(m.outcome === "1") ganador = m.jugador1_id
    if(m.outcome === "2") ganador = m.jugador2_id
    if(m.outcome === "3") empate = true

    // 🔥 BYE: si no hay jugador2, auto-confirmar victoria para jugador1
    const esBye = m.jugador2_id === null || m.jugador2_id === undefined
    if(esBye && !ganador) {
      ganador = m.jugador1_id
    }

    return {
 ronda_id: rondaDB.id,
  mesa: m.mesa,
  jugador1_id: m.jugador1_id,
  jugador2_id: m.jugador2_id,
  ganador_final: ganador,
  empate: empate,
  confirmado: esBye || ganador !== null || empate, // 🔥 BYE: siempre confirmado
  evento_id: evento.id,
    }
  })

  await supabase.from("matches").insert(matchesInsert)
}