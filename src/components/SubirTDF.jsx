import { useEffect, useState, useRef } from "react"
import { parseTDF } from "../utils/parseTDF"
import { guardarRonda } from "../service/rondasService"
import { supabase } from "../supabase"
import { obtenerEventos, crearEvento } from "../utils/evento"
import { showToast } from "../utils/toast"

export default function SubirTDF() {
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState("")
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0])

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mensaje, setMensaje] = useState("")
  const [loading, setLoading] = useState(false)
  const [puedeReemplazar, setPuedeReemplazar] = useState(false)

  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [stats, setStats] = useState(null)
  const [matchesDetalle, setMatchesDetalle] = useState([])
  const [matches, setMatches] = useState([])
  const [standingsPreview, setStandingsPreview] = useState([])
  const [standings, setStandings] = useState([])
  const [modo, setModo] = useState("ronda")
  const fileInputRef = useRef(null)

  const notificarActualizacion = (tipo, torneoId = torneoSeleccionado, eventoId = eventoSeleccionado) => {
    window.dispatchEvent(
      new CustomEvent("torneo:data-updated", {
        detail: {
          tipo,
          torneo_id: torneoId || null,
          evento_id: eventoId || null
        }
      })
    )
  }

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

    if (lista.length === 1) {
      setTorneoSeleccionado(lista[0].id)
    }
  }

  // =========================
  // 🔥 CARGAR EVENTOS
  // =========================
  useEffect(() => {
    if (!torneoSeleccionado) return
    cargarEventos()
  }, [torneoSeleccionado])

  useEffect(() => {
    const onDataUpdated = async (event) => {
      const detail = event?.detail || {}
      const torneoId = String(detail.torneo_id || "")
      const tipo = String(detail.tipo || "")

      if (!torneoSeleccionado) return
      if (torneoId && String(torneoSeleccionado) !== torneoId) return
      if (tipo !== "evento_archivado" && tipo !== "evento_creado") return

      await cargarEventos()
    }

    window.addEventListener("torneo:data-updated", onDataUpdated)
    return () => window.removeEventListener("torneo:data-updated", onDataUpdated)
  }, [torneoSeleccionado])

  const cargarEventos = async () => {
    const data = await obtenerEventos(torneoSeleccionado)
    setEventos(data)
    if (data.length > 0) {
      setEventoSeleccionado(data[0].id)
    }
  }

  const crearNuevoEvento = async () => {
    try {
      const nuevo = await crearEvento(torneoSeleccionado, nuevaFecha)
      setEventos(prev => [nuevo, ...prev])
      setEventoSeleccionado(nuevo.id)
      setMensaje("Evento creado exitosamente")
      showToast("Evento creado exitosamente", "success")
      notificarActualizacion("evento_creado", torneoSeleccionado, nuevo.id)
    } catch (error) {
      setMensaje("Error al crear evento: " + error.message)
      showToast("No se pudo crear el evento", "error")
    }
  }

  // =========================
  // 🔄 EFECTOS
  // =========================
  useEffect(() => {
    if (rondaSeleccionada) {
      cargarStats()
    }
  }, [rondaSeleccionada])

  useEffect(() => {
    if (!eventoSeleccionado) return
    cargarRondas()
  }, [eventoSeleccionado])

  // =========================
  // 📊 RONDAS
  // =========================
  const cargarRondas = async () => {
    if (!eventoSeleccionado) return
    const { data } = await supabase
      .from("rondas")
      .select("*")
      .eq("evento_id", eventoSeleccionado)
      .order("numero_ronda", { ascending: false })

    setRondas([...(data || [])])
    const activa = data?.find(r => r.status === "activa")
    if (activa) {
      setRondaSeleccionada(activa.id)
    } else {
      setRondaSeleccionada(null)
      await cargarStandings()
    }
  }

  // =========================
  // 📊 STATS
  // =========================
  const cargarStats = async () => {
    if (!eventoSeleccionado) return
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)
      .order("mesa", { ascending: true })

    if (!data) {
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
    ;(jugadores || []).forEach(j => {
      mapa[j.player_id] = j.nombre
    })

    const formateados = (data || []).map(m => ({
      ...m,
      j1_nombre: mapa[m.jugador1_id] || m.jugador1_id,
      j2_nombre: mapa[m.jugador2_id] || m.jugador2_id
    }))

    setMatches(formateados)
    setStats({
      total,
      confirmados,
      pendientes: total - confirmados
    })
  }

  // =========================
  // 📊 STANDINGS
  // =========================
  const cargarStandings = async () => {
    if (!eventoSeleccionado) return
    const { data } = await supabase
      .from("standings")
      .select("*")
      .eq("evento_id", eventoSeleccionado)
      .order("posicion", { ascending: true })

    if (!data) {
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
  // 📁 SUBIR ARCHIVO
  // =========================
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setMensaje("")

    try {
      const parsed = await parseTDF(selectedFile)
      setPreview(parsed)

      // 🔥 Filtrar rondas por evento
      const rondasExistentes = rondas.map(r => r.numero_ronda)
      const puede = parsed.rounds.some(r => rondasExistentes.includes(r.numero))
      setPuedeReemplazar(puede)

    } catch (error) {
      setMensaje("Error al parsear TDF: " + error.message)
    }
  }

  // =========================
  // 🚀 SUBIR RONDA
  // =========================
  const subirRonda = async (rondaIndex) => {
    if (!eventoSeleccionado) {
      setMensaje("Selecciona un evento primero")
      showToast("Selecciona un evento primero", "warning")
      return
    }

    setLoading(true)
    try {
      const ronda = preview.rounds[rondaIndex]
      await guardarRonda(eventoSeleccionado, ronda)
      setMensaje("Ronda subida exitosamente")
      showToast(`Ronda ${ronda.numero} subida exitosamente`, "success")
      await cargarRondas()
      notificarActualizacion("ronda_subida")
    } catch (error) {
      if (error?.message === "CONFIRM_REPLACE_FINALIZADA") {
        const ronda = preview.rounds[rondaIndex]
        const confirmarReemplazo = window.confirm(
          `La ronda ${ronda.numero} ya estaba finalizada. Quieres reemplazarla con la version del archivo TDF?`
        )

        if (!confirmarReemplazo) {
          setMensaje("Se cancelo el reemplazo de la ronda finalizada.")
          showToast("Reemplazo cancelado", "warning")
          setLoading(false)
          return
        }

        try {
          await guardarRonda(eventoSeleccionado, ronda, { forzarReemplazoFinalizada: true })
          setMensaje(`Ronda ${ronda.numero} reemplazada exitosamente.`)
          showToast(`Ronda ${ronda.numero} reemplazada`, "success")
          await cargarRondas()
          notificarActualizacion("ronda_reemplazada")
        } catch (errorReemplazo) {
          setMensaje("Error al reemplazar ronda: " + errorReemplazo.message)
          showToast("No se pudo reemplazar la ronda", "error")
        }
      } else {
        setMensaje("Error: " + error.message)
        showToast(`Error al subir ronda: ${error.message}`, "error")
      }
    }
    setLoading(false)
  }

  // =========================
  // 🏆 SUBIR STANDINGS
  // =========================
  const subirStandings = async () => {
    if (!eventoSeleccionado) {
      setMensaje("Selecciona un evento primero")
      showToast("Selecciona un evento primero", "warning")
      return
    }

    setLoading(true)
    try {
      const nuevosStandings = (preview?.standings || []).map(s => ({
        torneo_id: torneoSeleccionado,
        player_id: s.player_id,
        posicion: s.posicion,
        evento_id: eventoSeleccionado
      }))

      const { data: existentes, error: errorExistentes } = await supabase
        .from("standings")
        .select("id, player_id")
        .eq("evento_id", eventoSeleccionado)

      if (errorExistentes) {
        throw errorExistentes
      }

      const mapaExistentes = new Map(
        (existentes || []).map(item => [String(item.player_id), item.id])
      )
      const mapaNuevos = new Map(
        nuevosStandings.map(item => [String(item.player_id), item])
      )

      const playerIdsAEliminar = (existentes || [])
        .map(item => String(item.player_id))
        .filter(playerId => !mapaNuevos.has(playerId))

      if (playerIdsAEliminar.length > 0) {
        const { error: errorDelete } = await supabase
          .from("standings")
          .delete()
          .eq("evento_id", eventoSeleccionado)
          .in("player_id", playerIdsAEliminar)

        if (errorDelete) {
          throw errorDelete
        }
      }

      const updates = []
      const inserts = []

      nuevosStandings.forEach(item => {
        const standingId = mapaExistentes.get(String(item.player_id))
        if (standingId) {
          updates.push(
            supabase
              .from("standings")
              .update({
                posicion: item.posicion,
                torneo_id: item.torneo_id
              })
              .eq("id", standingId)
          )
        } else {
          inserts.push(item)
        }
      })

      if (updates.length > 0) {
        const resultadosUpdates = await Promise.all(updates)
        const updateConError = resultadosUpdates.find(r => r.error)
        if (updateConError?.error) {
          throw updateConError.error
        }
      }

      if (inserts.length > 0) {
        const { error: errorInsert } = await supabase.from("standings").insert(inserts)
        if (errorInsert) {
          throw errorInsert
        }
      }

      setMensaje("Standings subidos exitosamente")
      showToast("Standings sincronizados correctamente", "success")
      await cargarStandings()
      notificarActualizacion("standings_subidos")
    } catch (error) {
      setMensaje("Error: " + error.message)
      showToast(`Error al subir standings: ${error.message}`, "error")
    }
    setLoading(false)
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Subir TDF</h2>

      {/* Selector de Torneo */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Torneo</label>
        <select
          value={torneoSeleccionado}
          onChange={(e) => setTorneoSeleccionado(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Seleccionar torneo</option>
          {torneos.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        {torneos.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {torneos.map(t => (
              <button
                key={`admin-tdf-${t.id}`}
                onClick={() => setTorneoSeleccionado(String(t.id))}
                className={`px-3 py-1 rounded-full text-sm border ${
                  String(torneoSeleccionado) === String(t.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de Evento */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Evento</label>
        <select
          value={eventoSeleccionado}
          onChange={(e) => setEventoSeleccionado(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Seleccionar evento</option>
          {eventos.map(e => (
            <option key={e.id} value={e.id}>
              {e.fecha} - {new Date(e.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
            </option>
          ))}
        </select>
      </div>

      {/* Crear Evento */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Nueva Fecha de Evento</label>
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={crearNuevoEvento}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Crear Evento
        </button>
      </div>

      {/* Subir Archivo */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".tdf"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
      </div>

      {mensaje && <p className="text-red-500 mb-4">{mensaje}</p>}

      {preview && (
        <div className="mb-4 border rounded-xl p-3 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <p className="text-sm text-gray-600 mb-3">
            Rondas detectadas: {preview?.rounds?.length || 0} | Standings: {preview?.standings?.length || 0}
          </p>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
            {(preview?.rounds || []).map((r, i) => (
              <div key={i} className="bg-white border rounded p-2 flex items-center justify-between">
                <span className="text-sm font-medium">Ronda {r.numero}</span>
                <button
                  onClick={() => subirRonda(i)}
                  disabled={loading}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                >
                  Subir
                </button>
              </div>
            ))}
          </div>

          {preview?.standings?.length > 0 && (
            <button
              onClick={subirStandings}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded mt-3"
            >
              Subir Standings
            </button>
          )}
        </div>
      )}

      {/* Resto del componente... */}
    </div>
  )
}
