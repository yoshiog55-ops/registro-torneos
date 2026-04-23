import { supabase } from "../supabase"

export async function sincronizarStandings(eventoId, torneoId, standings) {
  const nuevosStandings = (standings || []).map((standing, index) => ({
    torneo_id: torneoId,
    player_id: standing.player_id,
    posicion: index + 1,
    evento_id: eventoId
  }))

  const { data: existentes, error: errorExistentes } = await supabase
    .from("standings")
    .select("id, player_id")
    .eq("evento_id", eventoId)

  if (errorExistentes) {
    throw errorExistentes
  }

  const mapaExistentes = new Map(
    (existentes || []).map(item => [String(item.player_id), item.id])
  )
  const mapaNuevos = new Map(
    nuevosStandings.map(item => [String(item.player_id), item])
  )

  const playerIdsAEliminar = (existentes || [])
    .map(item => String(item.player_id))
    .filter(playerId => !mapaNuevos.has(playerId))

  if (playerIdsAEliminar.length > 0) {
    const { error: errorDelete } = await supabase
      .from("standings")
      .delete()
      .eq("evento_id", eventoId)
      .in("player_id", playerIdsAEliminar)

    if (errorDelete) {
      throw errorDelete
    }
  }

  const updates = []
  const inserts = []

  nuevosStandings.forEach(item => {
    const standingId = mapaExistentes.get(String(item.player_id))

    if (standingId) {
      updates.push(
        supabase
          .from("standings")
          .update({
            posicion: item.posicion,
            torneo_id: item.torneo_id
          })
          .eq("id", standingId)
      )
    } else {
      inserts.push(item)
    }
  })

  if (updates.length > 0) {
    const resultadosUpdates = await Promise.all(updates)
    const updateConError = resultadosUpdates.find(resultado => resultado.error)
    if (updateConError?.error) {
      throw updateConError.error
    }
  }

  if (inserts.length > 0) {
    const { error: errorInsert } = await supabase.from("standings").insert(inserts)
    if (errorInsert) {
      throw errorInsert
    }
  }
}
