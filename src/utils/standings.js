function asegurarJugador(mapa, playerId, nombre) {
  if (!playerId) return

  if (!mapa[playerId]) {
    mapa[playerId] = {
      player_id: playerId,
      nombre: nombre || playerId,
      wins: 0,
      losses: 0,
      draws: 0,
      matchPoints: 0
    }
  } else if (nombre && (!mapa[playerId].nombre || mapa[playerId].nombre === playerId)) {
    mapa[playerId].nombre = nombre
  }
}

export function calcularStandingsDesdeMatches(matches, mapaJugadores = {}) {
  const acumulado = {}

  ;(matches || []).forEach(match => {
    const jugador1 = match.jugador1_id || null
    const jugador2 = match.jugador2_id || null

    asegurarJugador(acumulado, jugador1, mapaJugadores[jugador1])
    asegurarJugador(acumulado, jugador2, mapaJugadores[jugador2])

    if (!match.confirmado) return
    if (!jugador1) return

    const statsJ1 = acumulado[jugador1]
    const statsJ2 = jugador2 ? acumulado[jugador2] : null

    if (!jugador2) {
      statsJ1.wins += 1
      statsJ1.matchPoints += 3
      return
    }

    if (match.empate) {
      statsJ1.draws += 1
      statsJ1.matchPoints += 1

      if (statsJ2) {
        statsJ2.draws += 1
        statsJ2.matchPoints += 1
      }
      return
    }

    const ganador = match.ganador_final || null

    if (ganador && ganador === jugador1) {
      statsJ1.wins += 1
      statsJ1.matchPoints += 3
      if (statsJ2) statsJ2.losses += 1
      return
    }

    if (ganador && ganador === jugador2) {
      if (statsJ2) {
        statsJ2.wins += 1
        statsJ2.matchPoints += 3
      }
      statsJ1.losses += 1
    }
  })

  return Object.values(acumulado)
    .sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.draws !== a.draws) return b.draws - a.draws
      if (a.losses !== b.losses) return a.losses - b.losses
      return String(a.nombre || a.player_id).localeCompare(String(b.nombre || b.player_id), "es", {
        sensitivity: "base"
      })
    })
    .map((jugador, index) => ({
      ...jugador,
      posicion: index + 1
    }))
}
