import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import SelectorRonda from "../components/SelectorRonda"
import MatchCard from "../components/MatchCard"

export default function Pareos() {

  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])

  const [userId, setUserId] = useState(null)
  const [inputId, setInputId] = useState("")
  const [esAdmin, setEsAdmin] = useState(false)

  const [confirmacion, setConfirmacion] = useState(null)
  const [mensaje, setMensaje] = useState("")

  // 🔐 INIT
  useEffect(() => {
    init()
  }, [])

  const init = async () => {

    const { data } = await supabase.auth.getSession()

    if(data.session){
      setEsAdmin(true)
    }

    const saved = localStorage.getItem("player_id")
    if(saved){
      setUserId(saved)
    }

    cargarRondas()
  }

  useEffect(() => {
    if(rondaSeleccionada){
      cargarMatches()
    }
  }, [rondaSeleccionada])

  // 📊 RONDAS
  const cargarRondas = async () => {
    const { data } = await supabase
      .from("rondas")
      .select("*")
      .order("numero_ronda", { ascending: false })

    setRondas(data || [])

    const activa = data?.find(r => r.status === "activa")
    if(activa){
      setRondaSeleccionada(activa.id)
    }
  }

  // 📊 MATCHES
  const cargarMatches = async () => {

const { data } = await supabase
  .from("matches")
  .select("*")
  .eq("ronda_id", rondaSeleccionada)
  .order("mesa", { ascending: true })

    if(!data){
      setMatches([])
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

    let formateado = data.map(m => ({
      ...m,
      jugador1_nombre: mapa[m.jugador1_id] || "Desconocido",
      jugador2_nombre: mapa[m.jugador2_id] || "Desconocido"
    }))

    // 🔥 FILTRAR SOLO SUS MATCHES (si no es admin)
    if(!esAdmin && userId){
      formateado = formateado.filter(m =>
        String(m.jugador1_id) === String(userId) ||
        String(m.jugador2_id) === String(userId)
      )
    }

    setMatches(formateado)
  }

  // 🔄 CONFIRMACIÓN DOBLE
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

  // 🎯 REPORTAR
const reportar = async (match, ganador) => {

  const user = String(userId || "").trim()
  const j1 = String(match.jugador1_id).trim()
  const j2 = String(match.jugador2_id).trim()

  // 🚫 validación
  if(!esAdmin && user !== j1 && user !== j2){
    setMensaje("❌ No puedes reportar este match")
    return
  }

  // =========================
  // 🟡 EMPATE
  // =========================
  if(ganador === "empate"){

    // 🧑‍💼 ADMIN → directo
    if(esAdmin){
      await supabase
        .from("matches")
        .update({
          empate: true,
          ganador_final: null,
          confirmado: true,
          ganador_reportado_1: null,
          ganador_reportado_2: null
        })
        .eq("id", match.id)

      cargarMatches()
      return
    }

    // 👤 jugador
    await supabase
      .from("matches")
      .update({
        empate: true,
        ganador_final: null
      })
      .eq("id", match.id)

    await actualizarConfirmacion(match.id)
    cargarMatches()
    return
  }

  // =========================
  // 🧑‍💼 ADMIN → gana directo
  // =========================
  if(esAdmin){

    await supabase
      .from("matches")
      .update({
        ganador_final: ganador,
        empate: false, // 🔥 AQUÍ SE LIMPIA
        confirmado: true,
        ganador_reportado_1: ganador,
        ganador_reportado_2: ganador
      })
      .eq("id", match.id)

    cargarMatches()
    return
  }

  // =========================
  // 👤 JUGADOR
  // =========================
  const campo =
    user === j1
      ? "ganador_reportado_1"
      : "ganador_reportado_2"

  await supabase
    .from("matches")
    .update({
      [campo]: ganador,
      empate: false // 🔥 AQUÍ TAMBIÉN
    })
    .eq("id", match.id)

  await actualizarConfirmacion(match.id)

  cargarMatches()
}

  const confirmarReporte = async () => {

    const { match, ganador } = confirmacion

    let campo = "ganador_reportado_1"

    if(!esAdmin){
      campo =
        String(userId) === String(match.jugador1_id)
          ? "ganador_reportado_1"
          : "ganador_reportado_2"
    }

    await supabase
      .from("matches")
      .update({ [campo]: ganador })
      .eq("id", match.id)

    await actualizarConfirmacion(match.id)

    setConfirmacion(null)
    cargarMatches()
  }

  // 📱 MODAL PLAYER ID
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

      <h2 className="text-xl font-bold mb-4">
        📊 Pareos
      </h2>

      {mensaje && (
        <div className="bg-red-100 text-red-700 p-2 mb-3 rounded text-center">
          {mensaje}
        </div>
      )}

      {rondas.length === 0 ? (
        <div className="bg-white p-4 rounded shadow text-center">
          ⚠️ No hay rondas disponibles
        </div>
      ) : (
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

      {/* ✅ MODAL CONFIRMAR */}
      {confirmacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">

          <div className="bg-white p-5 rounded-xl w-[90%] max-w-sm">

            <p className="mb-4 text-center">
              ¿Confirmar resultado?
            </p>

            <div className="flex gap-3">
              <button
                onClick={()=>setConfirmacion(null)}
                className="flex-1 bg-gray-300 py-2 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarReporte}
                className="flex-1 bg-green-600 text-white py-2 rounded"
              >
                Confirmar
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}