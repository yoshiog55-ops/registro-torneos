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

    // 🔥 auto seleccionar si solo hay uno
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

    setRondas(data || [])

    const activa = data?.find(r => r.status === "activa")
    if(activa){
      setRondaSeleccionada(activa.id)
    }
  }

  // =========================
  // 📊 STATS + DETALLE
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

    // 🔥 nombres
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

    try{
      const { rounds } = await parseTDF(f)

      if(!rounds || rounds.length === 0){
        throw new Error("Archivo inválido")
      }

      const ronda = rounds[rounds.length - 1]

      const { data: activa } = await supabase
        .from("rondas")
        .select("*")
        .eq("torneo_id", torneoSeleccionado)
        .eq("status", "activa")

      if(activa.length > 0){
        const rondaActiva = activa[0]

        if(rondaActiva.numero_ronda === ronda.numero){
          setPuedeReemplazar(true)
          setMensaje("⚠️ Esta ronda ya existe (puedes reemplazarla)")
        }else{
          throw new Error("Ya hay una ronda activa. Debes finalizarla antes.")
        }
      }

      setPreview(ronda)

    }catch(err){
      setMensaje("❌ " + err.message)
    }
  }

  const handleUpload = async () => {

    if(!preview || !torneoSeleccionado) return

    if(!confirm("¿Confirmar subida de ronda?")) return

    try{
      setLoading(true)

      await guardarRonda(torneoSeleccionado, preview)

      setMensaje("✅ Ronda guardada correctamente")
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

    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)

    const pendientes = matches.filter(m => !m.confirmado)

    if(pendientes.length > 0){
      const confirmar = confirm(
        `Hay ${pendientes.length} pendientes ¿cerrar?`
      )
      if(!confirmar) return
    }

    await supabase
      .from("rondas")
      .update({ status: "finalizada" })
      .eq("id", rondaSeleccionada)

    await cargarRondas()
  }

  // =========================
  // 🧑‍💼 REPORTAR ADMIN
  // =========================
  const reportarAdmin = async (match, ganador) => {

    if(ganador === "empate"){
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
    }else{
      await supabase
        .from("matches")
        .update({
          ganador_final: ganador,
          empate: false,
          confirmado: true,
          ganador_reportado_1: ganador,
          ganador_reportado_2: ganador
        })
        .eq("id", match.id)
    }

    await cargarStats()
  }

  const rondaActual = rondas.find(r => r.id === rondaSeleccionada)

  return (
    <div className="bg-white p-5 rounded-xl shadow">

      <h3 className="text-lg font-bold mb-4">
        📤 Subir ronda (TDF)
      </h3>

      <select
        value={torneoSeleccionado}
        onChange={(e)=>setTorneoSeleccionado(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="">Selecciona torneo</option>
        {torneos.map(t=>(
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>

      <input type="file" accept=".tdf" onChange={handleFile} className="mb-4"/>

      {mensaje && (
        <div className="mb-4 text-sm p-2 rounded bg-gray-100">
          {mensaje}
        </div>
      )}

      {preview && (
        <div className="border p-3 mb-4 bg-gray-50">
          Ronda {preview.numero} ({preview.matches.length} matches)
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!preview || loading}
        className="w-full py-2 rounded bg-green-600 text-white"
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

              <button
                onClick={finalizarRonda}
                className="bg-red-600 text-white w-full mt-3 py-2 rounded"
              >
                Finalizar ronda
              </button>

            </div>
          )}

          {/* PENDIENTES */}
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

    </div>
  )
}