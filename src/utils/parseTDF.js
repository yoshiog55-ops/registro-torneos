export async function parseTDF(file){

  const text = await file.text()

  const parser = new DOMParser()
  const xml = parser.parseFromString(text, "text/xml")

  // =========================
  // 🎮 ROUNDS
  // =========================
  const roundsXML = xml.querySelectorAll("round")

  const rounds = Array.from(roundsXML).map(r => {

    const numero = Number(r.getAttribute("number"))

    const matchesXML = r.querySelectorAll("match")

    const matches = Array.from(matchesXML).map(m => {

const outcome = Number(m.getAttribute("outcome") || 0)

const isBye = outcome === 5

const p1 =
  m.querySelector("player1")?.getAttribute("userid") ||
  m.querySelector("player")?.getAttribute("userid") // ✅ BYE

const p2 = isBye
  ? null
  : m.querySelector("player2")?.getAttribute("userid")

const mesa = m.querySelector("tablenumber")?.textContent

return {
  jugador1_id: p1,
  jugador2_id: p2,
  mesa: isBye ? null : Number(mesa),
  outcome,
  isBye // 🔥 IMPORTANTE
}
    })

    return {
      numero,
      matches
    }
  })

  // =========================
  // 🏆 STANDINGS - LÓGICA CONDICIONAL
  // =========================
  
  const podsFinished = xml.querySelectorAll("standings pod[type='finished']")
  const allPods = Array.from(podsFinished).map(pod => {
    const players = pod.querySelectorAll("player")
    return {
      category: pod.getAttribute("category"),
      playerCount: players.length,
      players: Array.from(players).map(p => ({
        id: p.getAttribute("id"),
        place: Number(p.getAttribute("place"))
      }))
    }
  })

  const podsConJugadores = allPods.filter(pod => pod.playerCount > 0)
  const categoriasConJugadores = [...new Set(podsConJugadores.map(pod => String(pod.category ?? "")))]
  const hayJuniorsOSeniors = categoriasConJugadores.some(category => category === "0" || category === "1")
  const hasMultipleCategories = hayJuniorsOSeniors && categoriasConJugadores.length > 1

  let standings = []

  if (hasMultipleCategories) {
    // 🎯 MODO 1: Hay juniors/seniors reales
    // Respetar el orden oficial del archivo para la categoría principal
    // e insertar las categorías secundarias según sus match points.
    
    const allPlayers = new Set()
    allPods.forEach(pod => {
      pod.players.forEach(p => allPlayers.add(p.id))
    })

    const playerStats = {}
    
    Array.from(allPlayers).forEach(playerId => {
      playerStats[playerId] = {
        player_id: playerId,
        wins: 0,
        losses: 0,
        draws: 0,
        matchPoints: 0
      }
    })

    rounds.forEach(round => {
      round.matches.forEach(match => {
      const p1 = match.jugador1_id
      const p2 = match.jugador2_id

        if (match.outcome === 0) return

        if (match.outcome === 5) {
          if (playerStats[p1]) {
            playerStats[p1].wins++
            playerStats[p1].matchPoints += 3
          }
          return
        }

        if (!p1 || !p2) return

        const p1Stat = playerStats[p1]
        const p2Stat = playerStats[p2]

        if (!p1Stat || !p2Stat) return

        if (match.outcome === 1) {
          p1Stat.wins++
          p1Stat.matchPoints += 3
          p2Stat.losses++
        } else if (match.outcome === 2) {
          p2Stat.wins++
          p2Stat.matchPoints += 3
          p1Stat.losses++
        } else if (match.outcome === 3) {
          p1Stat.draws++
          p2Stat.draws++
          p1Stat.matchPoints += 1
          p2Stat.matchPoints += 1
        }
      })
    })

    const podsOrdenados = [...podsConJugadores].sort((a, b) => b.playerCount - a.playerCount)
    const podPrincipal = podsOrdenados[0]
    const podsSecundarios = podsOrdenados.slice(1)

    const base = [...podPrincipal.players]
      .sort((a, b) => a.place - b.place)
      .map(player => ({
        player_id: player.id,
        place: player.place,
        category: podPrincipal.category,
        ...playerStats[player.id]
      }))

    const secundarios = podsSecundarios
      .flatMap(pod => pod.players.map(player => ({
        player_id: player.id,
        place: player.place,
        category: pod.category,
        ...playerStats[player.id]
      })))
      .sort((a, b) => {
        if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints
        return a.place - b.place
      })

    const combinados = [...base]

    secundarios.forEach(player => {
      let insertAt = combinados.findIndex(item => item.matchPoints < player.matchPoints)

      if (insertAt === -1) {
        insertAt = combinados.length
      } else {
        while (insertAt < combinados.length && combinados[insertAt].matchPoints === player.matchPoints) {
          insertAt += 1
        }
      }

      combinados.splice(insertAt, 0, player)
    })

    standings = combinados.map((player, index) => ({
      player_id: player.player_id,
      posicion: index + 1,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws
    }))

  } else {
    // 🎯 MODO 2: Sin juniors/seniors reales → Usar solo lo que venga en el archivo
    
    if (podsConJugadores.length > 0) {
      standings = podsConJugadores.flatMap(pod => pod.players.map(p => ({
        player_id: p.id,
        posicion: p.place
      })))
    }
  }

  return {
    rounds,
    standings
  }
}
