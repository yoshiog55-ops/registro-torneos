import { useEffect, useState } from "react"
import { parseTDF } from "../utils/parseTDF"
import { guardarRonda } from "../service/rondasService"
import { supabase } from "../supabase"

export default function SubirTDF() {

  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mensaje, setMensaje] = useState("")
  const [loading, setLoading] = useState(false)
  const [puedeReemplazar, setPuedeReemplazar] = useState(false)

  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [stats, setStats] = useState(null)
  const [matchesDetalle, setMatchesDetalle] = useState([])

  const [standingsPreview, setStandingsPreview] = useState([])
  const [standings, setStandings] = useState([])

  // =========================
  // 🔥 CARGAR TORNEOS
  // =========================
  useEffect(() => {
    cargarTorneos()
  }, [])

  const cargarTorneos = async () => {
    const { data } = await supabase
      .from("torneos")
      .select("*")
      .eq("activo", true)

    const lista = data || []
    setTorneos(lista)

    if(lista.length === 1){
      setTorneoSeleccionado(lista[0].id)
    }
  }

  // =========================
  // 🔄 EFECTOS
  // =========================
  useEffect(() => {
    if(torneoSeleccionado){
      cargarRondas()
    }
  }, [torneoSeleccionado])

  useEffect(() => {
    if(rondaSeleccionada){
      cargarStats()
    }
  }, [rondaSeleccionada])

  // =========================
  // 📊 RONDAS
  // =========================
const cargarRondas = async () => {

  const { data } = await supabase
    .from("rondas")
    .select("*")
    .eq("torneo_id", torneoSeleccionado)
    .order("numero_ronda", { ascending: false })

 setRondas([...(data || [])])

  const activa = data?.find(r => r.status === "activa")

  if(activa){
    setRondaSeleccionada(activa.id)
  }else{
    setRondaSeleccionada(null)
    await cargarStandings()
  }
}

  // =========================
  // 📊 STATS
  // =========================
  const cargarStats = async () => {

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)

    if(!data){
      setStats(null)
      return
    }

    const total = data.length
    const confirmados = data.filter(m => m.confirmado).length
    const pendientes = data.filter(m => !m.confirmado)

    const ids = [
      ...new Set(data.flatMap(m => [m.jugador1_id, m.jugador2_id]))
    ]

    const { data: jugadores } = await supabase
      .from("jugadores")
      .select("player_id, nombre")
      .in("player_id", ids)

    const mapa = {}
    jugadores?.forEach(j => {
      mapa[j.player_id] = j.nombre
    })

    const detalle = pendientes.map(m => ({
      ...m,
      j1_nombre: mapa[m.jugador1_id] || m.jugador1_id,
      j2_nombre: mapa[m.jugador2_id] || m.jugador2_id
    }))

    setMatchesDetalle(detalle)

    setStats({
      total,
      confirmados,
      pendientes: total - confirmados
    })
  }

  // =========================
  // 📤 SUBIR ARCHIVO
  // =========================
  
  const handleFile = async (e) => {
const { data: activa } = await supabase
  .from("rondas")
  .select("*")
  .eq("torneo_id", torneoSeleccionado)
  .eq("status", "activa")

if(activa && activa.length > 0){
  setMensaje("❌ Debes finalizar la ronda actual antes de subir otra")
  return
}
    if(!torneoSeleccionado){
      setMensaje("❌ Selecciona un torneo primero")
      return
    }

    const f = e.target.files[0]
    if(!f) return

    setFile(f)
    setMensaje("")
    setPreview(null)
    setPuedeReemplazar(false)
    setStandingsPreview([])

    try{
      const { rounds, standings } = await parseTDF(f)

      if(
        (!rounds || rounds.length === 0) &&
        (!standings || standings.length === 0)
      ){
        throw new Error("Archivo inválido")
      }

      const esSoloStandings = (!rounds || rounds.length === 0) && standings?.length > 0

      if(rounds && rounds.length > 0){
        const ronda = rounds[rounds.length - 1]
        setPreview(ronda)
      }else{
        setPreview(null)
      }

      if(standings && standings.length > 0){
        setStandingsPreview(standings)

        if(esSoloStandings){
          setMensaje("🏆 Archivo de clasificación final detectado")
        }else{
          setMensaje("📊 Archivo con ronda + standings")
        }
      }

    }catch(err){
      setMensaje("❌ " + err.message)
    }
  }

  // =========================
  // 📤 SUBIR
  // =========================
  const handleUpload = async () => {

    if(!torneoSeleccionado) return

    if(!confirm("¿Confirmar subida?")) return

    try{
      setLoading(true)

      const esSoloStandings = standingsPreview.length > 0 && !preview

      // 🏆 SOLO STANDINGS
      if(esSoloStandings){

        await supabase
          .from("standings")
          .delete()
          .eq("torneo_id", torneoSeleccionado)

        await supabase
          .from("standings")
          .insert(
            standingsPreview.map(s => ({
              torneo_id: torneoSeleccionado,
              player_id: s.player_id,
              posicion: s.posicion
            }))
          )

        setMensaje("🏆 Standings finales publicados")

        setPreview(null)
        setFile(null)
        setStandingsPreview([])

        await cargarRondas()
        await cargarStandings()

        return
      }

      // 🎮 RONDA NORMAL
      if(preview){
        await guardarRonda(torneoSeleccionado, preview)
      }

// 🔥 SI TRAE STANDINGS → NO CREAR RONDA
if(standingsPreview.length > 0){

  const confirmar = confirm("¿Publicar standings finales?")
  if(!confirmar) return

  // 🧹 borrar standings previos
  await supabase
    .from("standings")
    .delete()
    .eq("torneo_id", torneoSeleccionado)

  // 💾 insertar standings
  await supabase
    .from("standings")
    .insert(
      standingsPreview.map(s => ({
        torneo_id: torneoSeleccionado,
        player_id: s.player_id,
        posicion: s.posicion
      }))
    )

  setMensaje("🏆 Standings finales publicados")

  // 🔥 FORZAR MODO FINAL
  setRondaSeleccionada(null)
  await cargarStandings()

  return // ⛔ IMPORTANTE: NO guarda ronda
}

// 👉 SOLO si NO hay standings
setMensaje("✅ Ronda guardada correctamente")

      setMensaje("✅ Ronda guardada correctamente")

      setPreview(null)
      setFile(null)
      setPuedeReemplazar(false)
      setStandingsPreview([])

      await cargarRondas()

    }catch(err){
      setMensaje("❌ " + err.message)
    }

    setLoading(false)
  }

  // =========================
  // 🔒 FINALIZAR RONDA
  // =========================
const finalizarRonda = async () => {

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("ronda_id", rondaSeleccionada)

  if(error){
    alert("❌ Error al obtener matches")
    return
  }

  const lista = matches || []

  if(lista.length === 0){
    alert("⚠️ No hay partidas en esta ronda")
    return
  }

  const pendientes = lista.filter(m => !m.confirmado)

  if(pendientes.length > 0){
    alert(`❌ No puedes finalizar. Hay ${pendientes.length} pendientes`)
    return
  }

await supabase
  .from("rondas")
  .update({ status: "finalizada" })
  .eq("id", rondaSeleccionada)

// 🔥 LIMPIAR SELECCIÓN
setRondaSeleccionada(null)

// 🔥 RECARGAR TODO
await cargarRondas()

// 🔥 OPCIONAL PERO RECOMENDADO
setMensaje("✅ Ronda finalizada")
}

  // =========================
  // 🧑‍💼 REPORTAR ADMIN
  // =========================
  const reportarAdmin = async (match, ganador) => {

    if(ganador === "empate"){
      await supabase.from("matches").update({
        empate: true,
        ganador_final: null,
        confirmado: true,
        ganador_reportado_1: null,
        ganador_reportado_2: null
      }).eq("id", match.id)
    }else{
      await supabase.from("matches").update({
        ganador_final: ganador,
        empate: false,
        confirmado: true,
        ganador_reportado_1: ganador,
        ganador_reportado_2: ganador
      }).eq("id", match.id)
    }

    await cargarStats()
  }

  // =========================
  // 🏆 STANDINGS
  // =========================
  const cargarStandings = async () => {

    const { data } = await supabase
      .from("standings")
      .select("*")
      .eq("torneo_id", torneoSeleccionado)
      .order("posicion", { ascending: true })

    setStandings(data || [])
  }

  const rondaActual = rondas.find(r => r.id === rondaSeleccionada)

  return (
    <div className="bg-white p-5 rounded-xl shadow">

      <h3 className="text-lg font-bold mb-4">📤 Subir ronda (TDF)</h3>

      <select
        value={torneoSeleccionado}
        onChange={(e)=>setTorneoSeleccionado(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="">Selecciona torneo</option>
        {torneos.map(t=>(
          <option key={t.id} value={t.id}>{t.nombre}</option>
        ))}
      </select>

      <input type="file" accept=".tdf" onChange={handleFile} className="mb-4"/>

      {mensaje && (
        <div className="mb-4 text-sm p-2 rounded bg-gray-100">{mensaje}</div>
      )}

      {preview && (
        <div className="border p-3 mb-4 bg-gray-50">
          Ronda {preview.numero} ({preview.matches.length} matches)
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={(!preview && standingsPreview.length === 0) || loading}
        className={`w-full py-2 rounded text-white ${
          (!preview && standingsPreview.length === 0)
            ? "bg-gray-400"
            : "bg-green-600"
        }`}
      >
        Subir ronda
      </button>

      {/* RONDAS */}
      {torneoSeleccionado && (
        <div className="mt-6">

          <p className="font-bold mb-2">Rondas</p>

          <div className="flex gap-2 flex-wrap mb-3">
            {rondas.map(r => (
              <button
                key={r.id}
                onClick={()=>setRondaSeleccionada(r.id)}
                className={`px-3 py-1 rounded ${
                  r.id === rondaSeleccionada
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                R{r.numero_ronda}
              </button>
            ))}
          </div>

          {rondaActual && (
            <p className="mb-2 font-semibold">
              Estado: {rondaActual.status === "activa" ? "🟡 Activa" : "🟢 Finalizada"}
            </p>
          )}

          {stats && (
            <div className="bg-gray-100 p-3 rounded">
              <p>Total: {stats.total}</p>
              <p className="text-green-600">Confirmados: {stats.confirmados}</p>
              <p className="text-red-600">Pendientes: {stats.pendientes}</p>

{rondaActual?.status === "activa" && (
  <button
    onClick={finalizarRonda}
    disabled={stats?.pendientes > 0}
    className={`w-full mt-3 py-2 rounded text-white ${
      stats?.pendientes > 0
        ? "bg-gray-400"
        : "bg-red-600"
    }`}
  >
    Finalizar ronda
  </button>
)}
            </div>
          )}

          {matchesDetalle.length > 0 && (
            <div className="mt-4 space-y-2">

              <p className="font-bold">Pendientes</p>

              {matchesDetalle.map(m => (
                <div key={m.id} className="bg-white p-2 rounded shadow">

                  <p>Mesa {m.mesa}</p>
                  <p>{m.j1_nombre} vs {m.j2_nombre}</p>

                  <div className="flex gap-2 mt-2">
                    <button onClick={()=>reportarAdmin(m, m.jugador1_id)} className="flex-1 bg-green-600 text-white py-1 rounded">J1</button>
                    <button onClick={()=>reportarAdmin(m, m.jugador2_id)} className="flex-1 bg-blue-600 text-white py-1 rounded">J2</button>
                    <button onClick={()=>reportarAdmin(m, "empate")} className="flex-1 bg-yellow-500 text-white py-1 rounded">Empate</button>
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>
      )}

      {/* STANDINGS */}
      {rondas.every(r => r.status === "finalizada") && standings.length > 0 && (
        <div className="mt-6 bg-white p-3 rounded shadow">

          <p className="font-bold mb-2">🏆 Standings</p>

          {standings.map(s => (
            <div key={s.player_id} className="flex justify-between border-b py-1">
              <span>#{s.posicion}</span>
              <span>{s.player_id}</span>
            </div>
          ))}

        </div>
      )}

    </div>
  )
}