import { useEffect, useMemo, useState } from "react"
import { supabase } from "../supabase"
import SubirTDF from "../components/SubirTDF"
import { obtenerEventos } from "../utils/evento"
import { showToast } from "../utils/toast"

function estadoDeMatch(match) {
  const r1 = match.ganador_reportado_1
  const r2 = match.ganador_reportado_2

  if (match.confirmado) return "Confirmado"
  if (r1 && r2 && r1 !== r2) return "Conflicto"
  if (r1 || r2) return "Esperando rival"
  return "Pendiente"
}

function formatearFechaEvento(fecha) {
  if (!fecha) return "Sin fecha"
  return new Date(fecha).toLocaleDateString("es-MX", { timeZone: "UTC" })
}

export default function AdminRondas() {
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState("")
  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState("")
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [stats, setStats] = useState(null)
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)
  const [vista, setVista] = useState("pareos")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  const eventoActual = useMemo(
    () => eventos.find(ev => String(ev.id) === String(eventoSeleccionado)) || null,
    [eventos, eventoSeleccionado]
  )
  const torneoActual = useMemo(
    () => torneos.find(t => String(t.id) === String(torneoSeleccionado)) || null,
    [torneos, torneoSeleccionado]
  )
  const rondaActual = useMemo(
    () => rondas.find(r => String(r.id) === String(rondaSeleccionada)) || null,
    [rondas, rondaSeleccionada]
  )
  const matchesFiltrados = useMemo(() => {
    if (filtroEstado === "todos") return matches
    return matches.filter(match => {
      const estado = String(match.estado || "").toLowerCase()
      return estado === filtroEstado
    })
  }, [matches, filtroEstado])

  useEffect(() => {
    cargarTorneos()
  }, [])

  useEffect(() => {
    limpiarVista()

    if (!torneoSeleccionado) return
    cargarEventosDeTorneo()
  }, [torneoSeleccionado])

  useEffect(() => {
    setRondas([])
    setRondaSeleccionada("")
    setMatches([])
    setStandings([])
    setStats(null)

    if (!eventoSeleccionado) return
    cargarRondas()
    cargarStandings()
  }, [eventoSeleccionado])

  useEffect(() => {
    setMatches([])
    setStats(null)
    setFiltroEstado("todos")

    if (!rondaSeleccionada) return
    cargarDetalleRonda()
  }, [rondaSeleccionada])

  useEffect(() => {
    const onDataUpdated = async (event) => {
      const detail = event?.detail || {}
      const torneoId = String(detail.torneo_id || "")
      const eventoId = String(detail.evento_id || "")

      if (torneoSeleccionado && torneoId && String(torneoSeleccionado) !== torneoId) {
        return
      }

      if (eventoSeleccionado && eventoId && String(eventoSeleccionado) !== eventoId) {
        return
      }

      await cargarEventosDeTorneo()
      if (eventoSeleccionado) {
        await cargarRondas()
        await cargarStandings()
      }
      if (rondaSeleccionada) {
        await cargarDetalleRonda()
      }
    }

    window.addEventListener("torneo:data-updated", onDataUpdated)
    return () => window.removeEventListener("torneo:data-updated", onDataUpdated)
  }, [torneoSeleccionado, eventoSeleccionado, rondaSeleccionada])

  const limpiarVista = () => {
    setEventos([])
    setEventoSeleccionado("")
    setRondas([])
    setRondaSeleccionada("")
    setMatches([])
    setStandings([])
    setStats(null)
    setVista("pareos")
    setMensaje("")
  }

  const cargarTorneos = async () => {
    const { data } = await supabase
      .from("torneos")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true })

    const lista = data || []
    setTorneos(lista)

    if (!torneoSeleccionado && lista.length > 0) {
      setTorneoSeleccionado(String(lista[0].id))
    }
  }

  const cargarEventosDeTorneo = async () => {
    const lista = await obtenerEventos(torneoSeleccionado)
    setEventos(lista)

    if (lista.length === 0) {
      setMensaje("Este torneo no tiene eventos todavia.")
      setEventoSeleccionado("")
      return
    }

    setMensaje("")
    const actual = lista.find(ev => String(ev.id) === String(eventoSeleccionado))
    setEventoSeleccionado(String(actual?.id || lista[0].id))
  }

  const cargarRondas = async () => {
    const { data } = await supabase
      .from("rondas")
      .select("*")
      .eq("evento_id", eventoSeleccionado)
      .order("numero_ronda", { ascending: false })

    const lista = data || []
    setRondas(lista)

    if (lista.length === 0) {
      setMensaje("Aun no hay rondas cargadas para este evento.")
      return
    }

    setMensaje("")
    const activa = lista.find(r => r.status === "activa")
    setRondaSeleccionada(String(activa?.id || lista[0].id))
  }

  const cargarDetalleRonda = async () => {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)
      .eq("evento_id", eventoSeleccionado)
      .order("mesa", { ascending: true })

    const lista = data || []

    if (lista.length === 0) {
      setMatches([])
      setStats({
        total: 0,
        confirmados: 0,
        pendientes: 0
      })
      return
    }

    const ids = [
      ...new Set(
        lista
          .flatMap(m => [m.jugador1_id, m.jugador2_id])
          .filter(Boolean)
      )
    ]

    const { data: jugadores } = await supabase
      .from("jugadores")
      .select("player_id, nombre")
      .in("player_id", ids)

    const mapaJugadores = {}
    ;(jugadores || []).forEach(j => {
      mapaJugadores[j.player_id] = j.nombre
    })

    const formateados = lista.map(m => ({
      ...m,
      estado: estadoDeMatch(m),
      jugador1_nombre: mapaJugadores[m.jugador1_id] || m.jugador1_id || "Desconocido",
      jugador2_nombre: mapaJugadores[m.jugador2_id] || m.jugador2_id || "BYE"
    }))

    const confirmados = formateados.filter(m => m.confirmado).length

    setMatches(formateados)
    setStats({
      total: formateados.length,
      confirmados,
      pendientes: formateados.length - confirmados
    })
  }

  const cargarStandings = async () => {
    if (!eventoSeleccionado) return
    const { data } = await supabase
      .from("standings")
      .select("*")
      .eq("evento_id", eventoSeleccionado)
      .order("posicion", { ascending: true })

    const lista = data || []
    if (lista.length === 0) {
      setStandings([])
      return
    }

    const ids = [...new Set(lista.map(s => s.player_id).filter(Boolean))]
    let mapaJugadores = {}

    if (ids.length > 0) {
      const { data: jugadores } = await supabase
        .from("jugadores")
        .select("player_id, nombre")
        .in("player_id", ids)

      mapaJugadores = (jugadores || []).reduce((acc, jugador) => {
        acc[jugador.player_id] = jugador.nombre
        return acc
      }, {})
    }

    const formateado = lista.map(s => ({
      ...s,
      nombre: mapaJugadores[s.player_id] || s.player_id
    }))

    setStandings(formateado)
  }

  const refrescarTodo = async () => {
    if (!torneoSeleccionado) return
    setCargando(true)

    await cargarEventosDeTorneo()
    if (eventoSeleccionado) {
      await cargarRondas()
      await cargarStandings()
      if (rondaSeleccionada) {
        await cargarDetalleRonda()
      }
    }
    setCargando(false)
  }

  const actualizarResultadoAdmin = async (match, ganador) => {
    const rondaActual = rondas.find(r => String(r.id) === String(rondaSeleccionada))
    if(rondaActual?.status === "finalizada"){
      setMensaje("La ronda ya finalizo y solo permite consulta.")
      showToast("La ronda ya esta finalizada. Solo consulta.", "warning")
      return
    }

    if(ganador === "empate"){
      await supabase
        .from("matches")
        .update({
          empate: true,
          confirmado: true,
          ganador_final: null,
          ganador_reportado_1: null,
          ganador_reportado_2: null
        })
        .eq("id", match.id)

      await cargarDetalleRonda()
      showToast("Resultado guardado", "success")
      return
    }

    await supabase
      .from("matches")
      .update({
        empate: false,
        confirmado: true,
        ganador_final: ganador,
        ganador_reportado_1: ganador,
        ganador_reportado_2: ganador
      })
      .eq("id", match.id)

    await cargarDetalleRonda()
    showToast("Resultado guardado", "success")
  }

  const finalizarRonda = async () => {
    if (!rondaSeleccionada || !eventoSeleccionado) return
    const rondaActual = rondas.find(r => String(r.id) === String(rondaSeleccionada))

    if (rondaActual?.status === "finalizada") {
      setMensaje("La ronda seleccionada ya estaba finalizada.")
      showToast("La ronda seleccionada ya estaba finalizada", "warning")
      return
    }

    const { data: actuales } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaSeleccionada)
      .eq("evento_id", eventoSeleccionado)

    const pendientes = (actuales || []).filter(m => !m.confirmado)
    if (pendientes.length > 0) {
      const confirmar = confirm(
        `Hay ${pendientes.length} match(es) sin confirmar. Quieres cerrar la ronda?`
      )
      if (!confirmar) return
    }

    await supabase
      .from("rondas")
      .update({ status: "finalizada" })
      .eq("id", rondaSeleccionada)

    setMensaje("Ronda finalizada correctamente.")
    showToast("Ronda finalizada correctamente", "success")
    await cargarRondas()
    await cargarDetalleRonda()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Gestion de rondas y pareos</h2>
          <button
            onClick={refrescarTodo}
            disabled={cargando}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            {cargando ? "Actualizando..." : "Refrescar"}
          </button>
        </div>

        <div className="mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Torneo</label>
            <div className="flex flex-wrap gap-2">
              {torneos.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTorneoSeleccionado(String(t.id))}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    String(torneoSeleccionado) === String(t.id)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Evento</label>
            <select
              value={eventoSeleccionado}
              onChange={e => setEventoSeleccionado(e.target.value)}
              disabled={!torneoSeleccionado || eventos.length === 0}
              className="border p-2 rounded w-full disabled:bg-gray-100"
            >
              <option value="">Selecciona evento</option>
              {eventos.map(ev => (
                <option key={ev.id} value={String(ev.id)}>
                  {ev.fecha} - {formatearFechaEvento(ev.fecha)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {eventoActual && (
          <p className="text-sm text-gray-600 mb-3">
            Evento actual: {eventoActual.fecha} ({formatearFechaEvento(eventoActual.fecha)})
          </p>
        )}

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Contexto: {torneoActual?.nombre || "Sin torneo"} {" > "} {eventoActual?.fecha || "Sin evento"} {" > "} {rondaActual ? `Ronda ${rondaActual.numero_ronda}` : "Sin ronda"}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setVista("pareos")}
            className={`px-3 py-1 rounded ${
              vista === "pareos" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            Pareos
          </button>
          <button
            onClick={() => setVista("standings")}
            className={`px-3 py-1 rounded ${
              vista === "standings" ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            Standings
          </button>
        </div>

        {vista === "pareos" && (
          <>
        <div className="flex gap-2 flex-wrap mb-4">
          {rondas.map(r => (
            <button
              key={r.id}
              onClick={() => setRondaSeleccionada(String(r.id))}
              className={`px-3 py-1 rounded-full border text-sm ${
                String(r.id) === String(rondaSeleccionada)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              R{r.numero_ronda} {r.status === "activa" ? "[Activa]" : "[Finalizada]"}
            </button>
          ))}
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700">Confirmados</p>
              <p className="text-xl font-bold text-green-700">{stats.confirmados}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-700">Pendientes</p>
              <p className="text-xl font-bold text-orange-700">{stats.pendientes}</p>
            </div>
          </div>
        )}

        {rondaSeleccionada && (
          <button
            onClick={finalizarRonda}
            disabled={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
            className="bg-red-600 text-white px-4 py-2 rounded w-full mb-4"
          >
            {rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"
              ? "Ronda ya finalizada"
              : "Finalizar ronda seleccionada"}
          </button>
        )}
          </>
        )}

        {mensaje && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded">
            {mensaje}
          </div>
        )}

        {vista === "pareos" && matches.length > 0 && (
          <>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { id: "todos", label: "Todos" },
              { id: "pendiente", label: "Pendientes" },
              { id: "esperando rival", label: "Esperando" },
              { id: "conflicto", label: "Conflictos" },
              { id: "confirmado", label: "Confirmados" }
            ].map(opcion => (
              <button
                key={opcion.id}
                onClick={() => setFiltroEstado(opcion.id)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                  filtroEstado === opcion.id
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Mesa</th>
                  <th className="py-2 pr-2">Jugador 1</th>
                  <th className="py-2 pr-2">Jugador 2</th>
                  <th className="py-2 pr-2">Resultado</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {matchesFiltrados.map(match => (
                  <tr key={match.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 font-semibold">#{match.mesa}</td>
                    <td className="py-2 pr-2">{match.jugador1_nombre}</td>
                    <td className="py-2 pr-2">{match.jugador2_nombre}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => actualizarResultadoAdmin(match, match.jugador1_id)}
                          disabled={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                          className={`px-2 py-1 text-xs rounded border ${
                            String(match.ganador_final) === String(match.jugador1_id) && match.confirmado
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {match.jugador1_nombre}
                        </button>
                        <button
                          onClick={() => actualizarResultadoAdmin(match, match.jugador2_id)}
                          disabled={!match.jugador2_id || rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                          className={`px-2 py-1 text-xs rounded border ${
                            String(match.ganador_final) === String(match.jugador2_id) && match.confirmado
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {match.jugador2_nombre}
                        </button>
                        <button
                          onClick={() => actualizarResultadoAdmin(match, "empate")}
                          disabled={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                          className={`px-2 py-1 text-xs rounded border ${
                            match.empate && match.confirmado
                              ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          Empate
                        </button>
                      </div>
                    </td>
                    <td className="py-2 font-medium">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          match.estado === "Confirmado"
                            ? "bg-green-100 text-green-700"
                            : match.estado === "Conflicto"
                              ? "bg-red-100 text-red-700"
                              : match.estado === "Esperando rival"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {match.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matchesFiltrados.length === 0 && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              No hay matches para el filtro seleccionado.
            </div>
          )}
          </>
        )}

        {vista === "standings" && (
          <div className="overflow-x-auto">
            {standings.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                Este evento aun no tiene standings cargados.
              </div>
            ) : (
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Pos</th>
                    <th className="py-2 pr-2">Jugador</th>
                    <th className="py-2">Player ID</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => (
                    <tr key={s.player_id} className="border-b last:border-b-0">
                      <td className="py-2 pr-2 font-semibold">#{s.posicion}</td>
                      <td className="py-2 pr-2">{s.nombre}</td>
                      <td className="py-2">{s.player_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm border">
        <SubirTDF />
      </div>
    </div>
  )
}
