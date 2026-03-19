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

      return {
        jugador1_id: p1,
        jugador2_id: p2,
        mesa: Number(mesa)
      }
    })

    return {
      numero,
      matches
    }
  })

  // =========================
  // 🏆 STANDINGS
  // =========================
  // 🔥 IMPORTANTE: Tomar SOLO el pod con la categoría más grande (el ranking global)
  const podsFinished = xml.querySelectorAll("standings pod[type='finished']")
  
  const allPods = Array.from(podsFinished).map(pod => {
    const players = pod.querySelectorAll("player")
    return {
      category: pod.getAttribute("category"),
      playerCount: players.length,
      players: players
    }
  })
  
  // 🔥 Seleccionar el pod con más jugadores (el ranking general)
  const mainPod = allPods.length > 0 
    ? allPods.reduce((prev, current) => 
        current.playerCount > prev.playerCount ? current : prev
      )
    : null

  const standings = mainPod 
    ? Array.from(mainPod.players).map(p => ({
        player_id: p.getAttribute("id"),
        posicion: Number(p.getAttribute("place")),
      }))
    : []

  return {
    rounds,
    standings
  }
}