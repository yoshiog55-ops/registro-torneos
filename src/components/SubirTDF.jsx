import { useEffect, useState, useRef } from "react"
import { parseTDF } from "../utils/parseTDF"
import { guardarRonda } from "../service/rondasService"
import { supabase } from "../supabase"
import { obtenerEventoActual } from "../utils/evento"
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
const [matches, setMatches] = useState([]) // 🔥 NUEVO
  const [standingsPreview, setStandingsPreview] = useState([])
  const [standings, setStandings] = useState([])
  const [eventoActual, setEventoActual] = useState(null)
const [modo, setModo] = useState("ronda") 
const fileInputRef = useRef(null)
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

  if(!torneoSeleccionado) return

  async function init(){
    const evento = await obtenerEventoActual(torneoSeleccionado)
    setEventoActual(evento)
  }

  init()

}, [torneoSeleccionado])

useEffect(() => {
  if(rondaSeleccionada){
    cargarStats()
  }
}, [rondaSeleccionada])

useEffect(() => {
  if(!torneoSeleccionado) return

  async function init(){

    // 🧹 limpiar primero
    setRondas([])
    setRondaSeleccionada(null)
    setMatches([])
    setMatchesDetalle([])
    setStats(null)
    setStandings([])
    setStandingsPreview([])
    setModo("ronda")

    // 🔥 cargar evento nuevo
    const evento = await obtenerEventoActual(torneoSeleccionado)
    setEventoActual(evento)
  }

  init()

}, [torneoSeleccionado])
useEffect(() => {
  if(eventoActual){
    cargarRondas()
  }
}, [eventoActual])

useEffect(() => {

  if(!rondaSeleccionada) return

  const channel = supabase
    .channel('admin-matches')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `evento_id=eq.${eventoActual.id}`
      },
      async () => {
        await cargarStats()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [rondaSeleccionada])
  // =========================
  // 📊 RONDAS
  // =========================
const cargarRondas = async () => {
if(!eventoActual) return
  const { data } = await supabase
    .from("rondas")
    .select("*")
    .eq("evento_id", eventoActual.id)
    .order("numero_ronda", { ascending: false })

 setRondas([...(data || [])])

  const activa = data?.find(r => r.status === "activa")

  if(activa){
    setRondaSeleccionada(activa.id)
  }else{
    setRondaSeleccionada(null)
    await cargarStandings()
  }

  if(!activa){
  const { data: standingsData } = await supabase
    .from("standings")
    .select("id")
    .eq("evento_id", eventoActual.id)

  if(standingsData && standingsData.length > 0){
    setModo("standings")
  }
}
}

  // =========================
  // 📊 STATS
  // =========================
const cargarStats = async () => {
  if(!eventoActual) return

  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("ronda_id", rondaSeleccionada)
    .order("mesa", { ascending: true })

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

  // ✅ PRIMERO crear mapa
  const mapa = {}
  ;(jugadores || []).forEach(j => {
    mapa[j.player_id] = j.nombre
  })

  // ✅ DESPUÉS mapear matches
  const formateados = (data || []).map(m => ({
    ...m,
    j1_nombre: mapa[m.jugador1_id] || m.jugador1_id,
    j2_nombre: mapa[m.jugador2_id] || m.jugador2_id
  }))

  setMatches(formateados)

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

  // 🔥 LIMPIAR ESTADO SIEMPRE
  setMensaje("")
  setPreview(null)
  setStandingsPreview([])

  // 🔥 VALIDAR TORNEO PRIMERO
  if(!torneoSeleccionado){
    setMensaje("❌ Selecciona un torneo primero")
    e.target.value = null
    return
  }

  if(!eventoActual?.id){
    setMensaje("❌ Evento no disponible")
    e.target.value = null
    return
  }

  // 🔥 VALIDAR ARCHIVO
  const f = e.target.files[0]
  if(!f) return

  // =========================
  // 🔥 VALIDAR RONDA ACTIVA
  // =========================
  const { data: activa } = await supabase
    .from("rondas")
    .select("*")
    .eq("torneo_id", torneoSeleccionado)
    .eq("evento_id", eventoActual.id)
    .eq("status", "activa")

  if(activa && activa.length > 0){

    const rondaActiva = activa[0]

    const { data: matches } = await supabase
      .from("matches")
      .select("confirmado")
      .eq("ronda_id", rondaActiva.id)

    const pendientes = (matches || []).filter(m => !m.confirmado)

    if(pendientes.length > 0){
      setMensaje(`❌ Hay ${pendientes.length} partidas sin confirmar`)
      e.target.value = null // 🔥 CLAVE (permite reintentar)
      return
    }

    // 🔥 AUTO FINALIZAR
    await supabase
      .from("rondas")
      .update({ status: "finalizada" })
      .eq("id", rondaActiva.id)

    // 🔥 OPCIONAL PERO RECOMENDADO
    await cargarRondas()
  }

  // =========================
  // 📄 PROCESAR ARCHIVO
  // =========================
  setFile(f)
  setPuedeReemplazar(false)

  try{
    const { rounds, standings } = await parseTDF(f)

    if(
      (!rounds || rounds.length === 0) &&
      (!standings || standings.length === 0)
    ){
      throw new Error("Archivo inválido")
    }

    const esSoloStandings =
      (!rounds || rounds.length === 0) &&
      standings?.length > 0

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
    e.target.value = null // 🔥 CLAVE (reintentar mismo archivo)
  }
}

  // =========================
  // 📤 SUBIR
  // =========================
const handleUpload = async () => {
const evento = await obtenerEventoActual(torneoSeleccionado)

  if(!torneoSeleccionado) return

  try{
    setLoading(true)

    const tieneStandings = standingsPreview.length > 0

    // 🏆 SI HAY STANDINGS → SOLO GUARDAR ESO
    if(tieneStandings){

      await supabase
        .from("standings")
        .delete()
  .eq("evento_id", evento.id)


await supabase
  .from("standings")
  .insert(
    standingsPreview.map(s => ({
      torneo_id: torneoSeleccionado,
      player_id: s.player_id,
      posicion: s.posicion,
      evento_id: evento.id // 🔥 CLAVE
    }))
  )

      setMensaje("🏆 Standings finales publicados")

      setPreview(null)
      setFile(null)
      setStandingsPreview([])

      await cargarRondas()
      await cargarStandings()

      return // 🔥 IMPORTANTE: cortar ejecución
    }

    // 🎮 SOLO SI NO HAY STANDINGS
    if(preview){
      await guardarRonda(torneoSeleccionado, preview)
      setMensaje("✅ Ronda guardada correctamente")
    }

    setPreview(null)
    setFile(null)
    setPuedeReemplazar(false)

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
    .eq("evento_id", eventoActual.id)

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
if(!eventoActual) return
  const { data } = await supabase
    .from("standings")
    .select("*")
    .eq("evento_id", eventoActual.id)
    .order("posicion", { ascending: true })

  if(!data){
    setStandings([])
    return
  }

  const ids = data.map(s => s.player_id)

  const { data: jugadores } = await supabase
    .from("jugadores")
    .select("player_id, nombre")
    .in("player_id", ids)

  const mapa = {}
  jugadores?.forEach(j => {
    mapa[j.player_id] = j.nombre
  })

const formateado = data.map(m => {
  return {
    ...m,
    nombre: mapa[m.player_id] || m.player_id, // 🔥 AQUI
  }
})
  setStandings(formateado)
}

  const rondaActual = rondas.find(r => r.id === rondaSeleccionada)

  return (
    <div className="bg-white p-5 rounded-xl shadow">

      <h3 className="text-lg font-bold mb-4">📤 Subir Informacion (TDF)</h3>

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

      <input type="file" accept=".tdf"  ref={fileInputRef} onChange={handleFile} className="mb-4"/>

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
        Subir Informacion
      </button>
<button
  onClick={async ()=>{
    await cargarRondas()
    if(rondaSeleccionada){
      await cargarStats()
    }
  }}
  className="w-full mt-2 py-2 rounded bg-gray-700 text-white"
>
  🔄 Refrescar
</button>
      {/* RONDAS */}
      {torneoSeleccionado && (
        <div className="mt-6">

          <p className="font-bold mb-2">Rondas</p>

<div className="flex gap-2 flex-wrap mb-3">

  {rondas.map(r => (
    <button
      key={r.id}
      onClick={()=>{
        setModo("ronda")
        setRondaSeleccionada(r.id)
      }}
      className={`px-3 py-1 rounded ${
        r.id === rondaSeleccionada && modo === "ronda"
          ? "bg-blue-600 text-white"
          : "bg-gray-200"
      }`}
    >
      R{r.numero_ronda}
    </button>
  ))}

  {/* 🏆 BOTÓN NUEVO */}
  {standings.length > 0 && (
    <button
      onClick={()=>{
        setModo("standings")
        setRondaSeleccionada(null)
      }}
      className={`px-3 py-1 rounded ${
        modo === "standings"
          ? "bg-yellow-500 text-white"
          : "bg-gray-200"
      }`}
    >
      🏆
    </button>
  )}

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
            </div>
          )}

{modo === "ronda" && (matches || []).length > 0 && (
  <div className="mt-4 space-y-2">

    <p className="font-bold">Matches</p>

    {(matches || []).map(m => {

      const r1 = m.ganador_reportado_1
      const r2 = m.ganador_reportado_2

      let estado = "pendiente"

      if(m.confirmado){
        estado = "confirmado"
      }else if(r1 && r2 && r1 !== r2){
        estado = "conflicto"
      }else if(r1 || r2){
        estado = "esperando"
      }

      const colorEstado = {
        pendiente: "bg-gray-100",
        esperando: "bg-yellow-100",
        conflicto: "bg-red-100",
        confirmado: "bg-green-100"
      }[estado]

      return (
        <div key={m.id} className={`${colorEstado} p-2 rounded shadow`}>

          <p>Mesa {m.mesa}</p>
          <p className="font-semibold">
  {m.j1_nombre} ({m.jugador1_id}) 
  {" vs "} 
  {m.j2_nombre} ({m.jugador2_id})
</p>

          <div className="text-xs mb-1">
            {r1 && <span className="text-blue-600 mr-2">J1 reportó</span>}
            {r2 && <span className="text-purple-600">J2 reportó</span>}
          </div>

          <div className="text-xs mb-2">
            {estado === "pendiente" && "⏳ Sin reportes"}
            {estado === "esperando" && "🟡 Falta confirmación"}
            {estado === "conflicto" && "🔴 Conflicto"}
            {estado === "confirmado" && "✅ Confirmado"}
          </div>

          {m.confirmado && (
  <p className="text-sm font-bold mt-1">
    {m.empate
      ? "🤝 Empate"
      : m.ganador_final === m.jugador1_id
        ? `🏆 Ganó: ${m.j1_nombre}`
        : `🏆 Ganó: ${m.j2_nombre}`
    }
  </p>
)}

          {rondaActual?.status === "activa" && (
            <div className="flex gap-2 mt-2">
<button
  onClick={()=>reportarAdmin(m, m.jugador1_id)}
  className={`flex-1 py-1 rounded border-2 ${
    m.ganador_reportado_1 === m.jugador1_id ||
    m.ganador_reportado_2 === m.jugador1_id
      ? "bg-green-600 text-white border-green-800"
      : "bg-gray-200"
  }`}
>
  J1
</button>

<button
  onClick={()=>reportarAdmin(m, m.jugador2_id)}
  className={`flex-1 py-1 rounded border-2 ${
    m.ganador_reportado_1 === m.jugador2_id ||
    m.ganador_reportado_2 === m.jugador2_id
      ? "bg-blue-600 text-white border-blue-800"
      : "bg-gray-200"
  }`}
>
  J2
</button>

<button
  onClick={()=>reportarAdmin(m, "empate")}
  className={`flex-1 py-1 rounded border-2 ${
    m.empate
      ? "bg-yellow-500 text-white border-yellow-700"
      : "bg-gray-200"
  }`}
>
  Empate
</button>
            </div>
          )}

          {rondaActual?.status === "finalizada" && (
            <p className="text-center text-xs text-gray-500 mt-2">
              🔒 Ronda finalizada (solo lectura)
            </p>
          )}

        </div>
      )
    })}

  </div>
)}    </div>
  )}

      {/* STANDINGS */}
     {modo === "standings" && standings.length > 0 && (
        <div className="mt-6 bg-white p-3 rounded shadow">

          <p className="font-bold mb-2">🏆 Standings</p>

          {standings.map(s => (
            <div key={s.player_id} className="flex justify-between border-b py-1">
              <span>#{s.posicion}</span>
<span>
  {s.nombre} ({s.player_id})
</span>            </div>
          ))}

        </div>
      )}

    </div>
  )
}