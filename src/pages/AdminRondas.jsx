import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import SubirTDF from "../components/SubirTDF"

export default function AdminRondas() {

  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    cargarTorneos()
  }, [])

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

  // 📊 TORNEOS
  const cargarTorneos = async () => {
    const { data } = await supabase
      .from("torneos")
      .select("*")
      .eq("activo", true)

    setTorneos(data || [])
  }

  // 📊 RONDAS
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

  // 📊 STATS
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

    setStats({
      total,
      confirmados,
      pendientes: total - confirmados
    })
  }

  // 🔒 FINALIZAR
const finalizarRonda = async () => {

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("ronda_id", rondaSeleccionada)

  if(!matches){
    setMensaje("❌ Error al cargar matches")
    return
  }

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

  // 🔥 LIMPIAR SELECCIÓN
  setRondaSeleccionada(null)

  // 🔥 FORZAR RECARGA COMPLETA
  await cargarRondas()
  await cargarStandings()

  setMensaje("✅ Ronda finalizada")
}

  return (
    <div className="max-w-4xl mx-auto p-4">

      <h2 className="text-xl font-bold mb-4">
        🧑‍💼 Gestión de rondas
      </h2>

      {/* SELECT TORNEO */}
      <select
        value={torneoSeleccionado}
        onChange={(e)=>setTorneoSeleccionado(e.target.value)}
        className="border p-2 rounded mb-4 w-full"
      >
        <option value="">Selecciona torneo</option>
        {torneos.map(t=>(
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>

      {/* SUBIR */}
      {torneoSeleccionado && (
        <div className="mb-6">
          <SubirTDF torneo_id={torneoSeleccionado} />
        </div>
      )}

      {/* RONDAS */}
      <div className="flex gap-2 flex-wrap mb-4">
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

      {/* INFO */}
      {stats && (
        <div className="bg-white p-4 rounded shadow">

          <p>Total: {stats.total}</p>
          <p className="text-green-600">Confirmados: {stats.confirmados}</p>
          <p className="text-red-600">Pendientes: {stats.pendientes}</p>

          <button
            onClick={finalizarRonda}
            className="bg-red-600 text-white w-full mt-4 py-2 rounded"
          >
            Finalizar ronda
          </button>

        </div>
      )}

    </div>
  )
}