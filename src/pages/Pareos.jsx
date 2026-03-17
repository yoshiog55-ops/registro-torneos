import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import SelectorRonda from "../components/SelectorRonda"
import MatchCard from "../components/MatchCard"

export default function Pareos() {

  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])

  const [pendientes, setPendientes] = useState([]) // 🔥 NUEVO

  const [userId, setUserId] = useState(null)
  const [inputId, setInputId] = useState("")
  const [esAdmin, setEsAdmin] = useState(false)

  const [mensaje, setMensaje] = useState("")
  const [tiempoRestante, setTiempoRestante] = useState(null)
  const [modo, setModo] = useState("rondas")

  // =========================
  // 🔐 INIT
  // =========================
  useEffect(() => {
    init()
  }, [])

  const init = async () => {

    const { data } = await supabase.auth.getSession()

    if(data.session){
      // ⚠️ aquí puedes mejorar luego con rol real
      setEsAdmin(true)
    }

    const saved = localStorage.getItem("player_id")
    if(saved){
      setUserId(saved)
    }

    const savedRonda = localStorage.getItem("ronda_id")
    if(savedRonda){
      setRondaSeleccionada(savedRonda)
    }

    cargarRondas()
  }

  // =========================
  // 🔄 REFRESH
  // =========================
  const refrescar = async () => {
    await cargarRondas()

    if(modo === "rondas"){
      await cargarMatches()
    }else{
      await cargarStandings()
    }
  }

useEffect(() => {

  const channel = supabase
    .channel('rondas-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rondas'
      },
      async () => {
        await cargarRondas() // 🔥 recarga todo automáticamente
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [])

useEffect(() => {

  if(!rondaSeleccionada) return

  const ronda = rondas.find(r => r.id === rondaSeleccionada)
  if(!ronda) return

useEffect(() => {
  if(rondaSeleccionada && modo === "rondas"){
    localStorage.setItem("ronda_id", rondaSeleccionada)
    cargarMatches()
  }
}, [rondaSeleccionada, modo])

  // =========================
  // 📊 RONDAS
  // =========================
const cargarRondas = async () => {

  const { data } = await supabase
    .from("rondas")
    .select("*")
    .order("numero_ronda", { ascending: false })

  setRondas(data || [])

  const activa = data?.find(r => r.status === "activa")

  if(activa){
    setModo("rondas")
    setRondaSeleccionada(activa.id)
  }else{

    // 🔥 validar si hay standings reales
    const { data: standingsData } = await supabase
      .from("standings")
      .select("id")
      .limit(1)

    if(standingsData && standingsData.length > 0){
      setModo("standings")
      cargarStandings()
    }else{
      setModo("sin_datos") // 🔥 NUEVO MODO
    }
  }
}

  // =========================
  // 📊 MATCHES
  // =========================
  const cargarMatches = async () => {

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)
      .order("mesa", { ascending: true })

    if(!data){
      setMatches([])
      setPendientes([])
      return
    }

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

let formateado = data.map(m => {

  const j1 = String(m.jugador1_id)
  const j2 = String(m.jugador2_id)

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

  return {
    ...m,
    estado, // 🔥 NUEVO
    jugador1_nombre: mapa[m.jugador1_id] || "Desconocido",
    jugador2_nombre: mapa[m.jugador2_id] || "Desconocido"
  }
})

    // 🔥 filtro jugador
    if(!esAdmin && userId){
      formateado = formateado.filter(m =>
        String(m.jugador1_id) === String(userId) ||
        String(m.jugador2_id) === String(userId)
      )
    }

    // 🔥 pendientes
    const pendientesFiltrados = formateado.filter(m => !m.confirmado)

    setPendientes(pendientesFiltrados)
    setMatches(formateado)
  }

  // =========================
  // 🏆 STANDINGS
  // =========================
  const cargarStandings = async () => {

    const { data } = await supabase
      .from("standings")
      .select("*")
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

    const formateado = data.map(s => ({
      ...s,
      nombre: mapa[s.player_id] || s.player_id
    }))

    setStandings(formateado)
  }

  // =========================
  // 🔄 CONFIRMACIÓN DOBLE
  // =========================
  const actualizarConfirmacion = async (matchId) => {

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()

    if(
      data.ganador_reportado_1 &&
      data.ganador_reportado_2 &&
      data.ganador_reportado_1 === data.ganador_reportado_2
    ){
      await supabase
        .from("matches")
        .update({
          ganador_final: data.ganador_reportado_1,
          confirmado: true
        })
        .eq("id", matchId)
    }
  }

useEffect(() => {

  const channel = supabase
    .channel('matches-global')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches'
      },
      async () => {
        if(modo === "rondas"){
          await cargarMatches()
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [modo, rondaSeleccionada])

useEffect(() => {

  const channel = supabase
    .channel('standings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'standings'
      },
      () => {
        cargarStandings()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [])

useEffect(() => {

  const channel = supabase
    .channel('rondas-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rondas'
      },
      async () => {
        await cargarRondas()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [])

  // =========================
  // 🎯 REPORTAR
  // =========================
  const reportar = async (match, ganador) => {

    const user = String(userId || "").trim()
    const j1 = String(match.jugador1_id).trim()
    const j2 = String(match.jugador2_id).trim()

    if(!esAdmin && user !== j1 && user !== j2){
      setMensaje("❌ No puedes reportar este match")
      return
    }

    // 🟡 EMPATE
    if(ganador === "empate"){

      if(esAdmin){
        await supabase.from("matches").update({
          empate: true,
          ganador_final: null,
          confirmado: true,
          ganador_reportado_1: null,
          ganador_reportado_2: null
        }).eq("id", match.id)

        cargarMatches()
        return
      }

      await supabase.from("matches").update({
        empate: true,
        ganador_final: null,
        confirmado: false,
        ganador_reportado_1: null,
        ganador_reportado_2: null
      }).eq("id", match.id)

      cargarMatches()
      return
    }

    // 🧑‍💼 ADMIN
    if(esAdmin){
      await supabase.from("matches").update({
        ganador_final: ganador,
        empate: false,
        confirmado: true,
        ganador_reportado_1: ganador,
        ganador_reportado_2: ganador
      }).eq("id", match.id)

      cargarMatches()
      return
    }

    // 👤 jugador
    const campo =
      user === j1
        ? "ganador_reportado_1"
        : "ganador_reportado_2"

    await supabase.from("matches").update({
      [campo]: ganador,
      empate: false
    }).eq("id", match.id)

    await actualizarConfirmacion(match.id)

    cargarMatches()
  }

  // =========================
  // 📱 PLAYER ID MODAL
  // =========================
  if(!esAdmin && !userId){
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-5 rounded-xl w-[90%] max-w-sm">

          <h3 className="text-center font-bold mb-3">
            Ingresa tu Player ID
          </h3>

          <input
            value={inputId}
            onChange={(e)=>setInputId(e.target.value)}
            className="border p-2 w-full rounded mb-3"
          />

          <button
            onClick={()=>{
              localStorage.setItem("player_id", inputId)
              setUserId(inputId)
            }}
            className="bg-blue-600 text-white w-full py-2 rounded"
          >
            Continuar
          </button>

        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
{modo === "rondas" && tiempoRestante && (
  <div className="bg-black text-white text-center py-2 rounded mb-3">
    ⏱️ {tiempoRestante}
  </div>
)}
      <h2 className="text-xl font-bold mb-4">📊 Pareos</h2>

      {/* 🔄 REFRESH */}
      <button
        onClick={refrescar}
        className="bg-gray-700 text-white px-4 py-2 rounded mb-4 w-full"
      >
        🔄 Refrescar
      </button>

      {/* 🔥 PENDIENTES */}
      {pendientes.length > 0 && modo === "rondas" && (
        <div className="bg-yellow-100 p-3 rounded mb-3 text-center">
          ⚠️ Tienes {pendientes.length} match(es) pendientes
        </div>
      )}

      {mensaje && (
        <div className="bg-red-100 text-red-700 p-2 mb-3 rounded text-center">
          {mensaje}
        </div>
      )}

      {/* 🏆 STANDINGS */}
      {modo === "standings" && (
        <div className="bg-white p-4 rounded shadow">

          <h3 className="font-bold mb-3">🏆 Standings</h3>

          {standings.map(s => (
            <div key={s.player_id} className="flex justify-between border-b py-2">
              <span className="w-8 font-bold">#{s.posicion}</span>
              <span className="flex-1">{s.nombre}</span>
            </div>
          ))}

        </div>
      )}

      {modo === "sin_datos" && (
  <div className="bg-white p-6 rounded shadow text-center">
    📭 Aún no existen pareos para este torneo
  </div>
)}

      {/* 🎮 RONDAS */}
      {modo === "rondas" && (
        <>
          <SelectorRonda
            rondas={rondas}
            rondaSeleccionada={rondaSeleccionada}
            setRonda={setRondaSeleccionada}
          />

          {matches.length === 0 ? (
            <div className="bg-white p-6 rounded shadow text-center mt-4">
              ⏳ Sin pareos
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {matches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onReport={reportar}
                  esAdmin={esAdmin}
                  userId={userId}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}