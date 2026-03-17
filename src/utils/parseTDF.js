export const parseTDF = async (file) => {
  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, "text/xml")

  const players = {}

  xml.querySelectorAll("players player").forEach(p => {
    const id = p.getAttribute("userid")

    const first = p.querySelector("firstname")?.textContent || ""
    const last = p.querySelector("lastname")?.textContent || ""

    const nombre = `${first} ${last}`.trim() || `Jugador ${id}`

    players[id] = nombre
  })

  const rounds = []

  xml.querySelectorAll("round").forEach(r => {
    const numero = parseInt(r.getAttribute("number"))
    const stage = r.getAttribute("stage")

    const matches = []

    r.querySelectorAll("match").forEach(m => {

      const p1Node = m.querySelector("player1")
      const p2Node = m.querySelector("player2")

      if(!p1Node || !p2Node) return // 🔥 evita crashes

      const p1 = p1Node.getAttribute("userid")
      const p2 = p2Node.getAttribute("userid")

      const outcome = m.getAttribute("outcome")
      const mesa = m.querySelector("tablenumber")?.textContent || "0"

      matches.push({
        jugador1_id: p1,
        jugador2_id: p2,
        mesa,
        outcome
      })
    })

    rounds.push({ numero, stage, matches })
  })

  return { players, rounds }
}