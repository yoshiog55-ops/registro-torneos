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

      const p1 = m.querySelector("player1")?.getAttribute("userid")
      const p2 = m.querySelector("player2")?.getAttribute("userid")
      const mesa = m.querySelector("tablenumber")?.textContent
      const outcome = Number(m.getAttribute("outcome"))

      return {
        jugador1_id: p1,
        jugador2_id: p2 || null, // 🔥 BYE: si no hay player2, es null
        mesa: Number(mesa),
        outcome // 1=p1 wins, 2=p2 wins, 3=draw
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

  // 🔥 DETECTAR: ¿Hay múltiples categorías (juniors + seniors)?
  const hasMultipleCategories = allPods.length > 1

  let standings = []

  if (hasMultipleCategories) {
    // 🎯 MODO 1: Múltiples categorías → Calcular con OWP/OOWP
    
    // Extraer todos los jugadores
    const allPlayers = new Set()
    allPods.forEach(pod => {
      pod.players.forEach(p => allPlayers.add(p.id))
    })

    // Calcular stats de cada jugador
    const playerStats = {}
    
    Array.from(allPlayers).forEach(playerId => {
      playerStats[playerId] = {
        player_id: playerId,
        wins: 0,
        losses: 0,
        draws: 0,
        opponents: [],
        owp: 0,
        oowp: 0
      }
    })

    // Procesar todos los matches
    rounds.forEach(round => {
      round.matches.forEach(match => {
        const p1 = match.jugador1_id
        const p2 = match.jugador2_id

        if (!p1 || !p2) return // Skip BYEs

        const p1Stat = playerStats[p1]
        const p2Stat = playerStats[p2]

        if (!p1Stat || !p2Stat) return

        if (match.outcome === 1) {
          p1Stat.wins++
          p2Stat.losses++
        } else if (match.outcome === 2) {
          p2Stat.wins++
          p1Stat.losses++
        } else if (match.outcome === 3) {
          p1Stat.draws++
          p2Stat.draws++
        }

        p1Stat.opponents.push(p2)
        p2Stat.opponents.push(p1)
      })
    })

    // Calcular OWP
    Object.values(playerStats).forEach(stat => {
      if (stat.opponents.length === 0) {
        stat.owp = 0
        return
      }

      let opponentWins = 0
      let opponentGames = 0

      stat.opponents.forEach(oppId => {
        const opp = playerStats[oppId]
        if (opp) {
          opponentWins += opp.wins
          opponentGames += opp.wins + opp.losses + opp.draws
        }
      })

      stat.owp = opponentGames > 0 ? opponentWins / opponentGames : 0
    })

    // Calcular OOWP
    Object.values(playerStats).forEach(stat => {
      let oowpSum = 0
      let oowpCount = 0

      stat.opponents.forEach(oppId => {
        const opp = playerStats[oppId]
        if (opp) {
          oowpSum += opp.owp
          oowpCount++
        }
      })

      stat.oowp = oowpCount > 0 ? oowpSum / oowpCount : 0
    })

    // Ordenar con tiebreakers (W > OWP > OOWP)
    const sortedPlayers = Array.from(allPlayers)
      .map(id => playerStats[id])
      .sort((a, b) => {
        const aWins = a.wins
        const bWins = b.wins
        if (aWins !== bWins) return bWins - aWins

        if (Math.abs(a.owp - b.owp) > 0.0001) return b.owp - a.owp

        if (Math.abs(a.oowp - b.oowp) > 0.0001) return b.oowp - a.oowp

        return 0
      })

    standings = sortedPlayers.map((stat, index) => ({
      player_id: stat.player_id,
      posicion: index + 1,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      owp: stat.owp,
      oowp: stat.oowp
    }))

  } else {
    // 🎯 MODO 2: Una sola categoría → Usar standings del archivo
    
    if (allPods.length > 0) {
      standings = allPods[0].players.map(p => ({
        player_id: p.id,
        posicion: p.place
      }))
    }
  }

  return {
    rounds,
    standings
  }
}