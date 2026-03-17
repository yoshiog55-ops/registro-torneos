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
  const standingsXML = xml.querySelectorAll("standings pod[type='finished'] player")

  const standings = Array.from(standingsXML).map(p => ({
    player_id: p.getAttribute("id"),
    posicion: Number(p.getAttribute("place")),
  }))

  return {
    rounds,
    standings
  }
}