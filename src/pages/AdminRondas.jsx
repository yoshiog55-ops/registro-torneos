import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../supabase"
import SubirTDF from "../components/SubirTDF"
import { formatEventDate } from "../utils/date"
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
  return formatEventDate(fecha)
}

function normalizarId(valor) {
  if (valor === null || valor === undefined) return null
  const limpio = String(valor).trim()
  if (!limpio) return null
  if (limpio.toLowerCase() === "null") return null
  if (limpio.toLowerCase() === "undefined") return null
  return limpio
}

function resolverEtiquetaReporte(match, reporte) {
  const j1 = normalizarId(match.jugador1_id)
  const j2 = normalizarId(match.jugador2_id)

  if (!reporte && !match.empate) return "Sin reporte"
  if (match.empate && !match.ganador_reportado_1 && !match.ganador_reportado_2) return "Empate"
  if (reporte === j1) return match.jugador1_nombre
  if (reporte === j2) return match.jugador2_nombre
  return "Empate"
}

function claseBotonResultado(match, objetivo) {
  const objetivoNormalizado = normalizarId(objetivo)
  const reporte1 = normalizarId(match.ganador_reportado_1)
  const reporte2 = normalizarId(match.ganador_reportado_2)
  const ganadorFinal = normalizarId(match.ganador_final)
  const fueReportado = objetivoNormalizado && (reporte1 === objetivoNormalizado || reporte2 === objetivoNormalizado)

  if (match.confirmado && ganadorFinal === objetivoNormalizado) {
    return "bg-green-600 text-white border-green-600"
  }

  if (match.estado === "Conflicto" && fueReportado) {
    return "border-red-500 text-red-500 bg-white"
  }

  if (fueReportado) {
    return "border-green-600 text-green-600 bg-white"
  }

  return "bg-white border-gray-300"
}

function claseBotonEmpate(match) {
  if (match.empate && match.confirmado) {
    return "bg-yellow-500 text-white border-yellow-500"
  }

  if (match.estado === "Conflicto" && match.empate) {
    return "border-red-500 text-red-500 bg-white"
  }

  if (match.empate) {
    return "border-yellow-500 text-yellow-600 bg-white"
  }

  return "bg-white border-gray-300"
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
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported"
  )
  const rondaSeleccionadaRef = useRef("")
  const permisoNotificacionesRef = useRef(
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported"
  )
  const audioContextRef = useRef(null)
  const rondaListaNotificadaRef = useRef(null)

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

  const seleccionarRonda = (rondaId) => {
    const siguienteId = String(rondaId || "")
    rondaSeleccionadaRef.current = siguienteId
    setRondaSeleccionada(siguienteId)
    return siguienteId
  }

  const reproducirAvisoSonoroFuerte = () => {
    if (typeof window === "undefined") return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const context = audioContextRef.current
      if (context.state === "suspended") {
        context.resume().catch(() => {})
      }

      const notas = [
        { inicio: 0, frecuencia: 880, duracion: 0.18 },
        { inicio: 0.24, frecuencia: 988, duracion: 0.18 },
        { inicio: 0.48, frecuencia: 1174, duracion: 0.26 }
      ]

      notas.forEach(nota => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const startAt = context.currentTime + nota.inicio
        const endAt = startAt + nota.duracion

        oscillator.type = "square"
        oscillator.frequency.setValueAtTime(nota.frecuencia, startAt)

        gain.gain.setValueAtTime(0.0001, startAt)
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(startAt)
        oscillator.stop(endAt)
      })
    } catch {
      // Ignorar si el navegador bloquea audio automatico.
    }
  }

  const avisarLocalmente = ({ titulo, cuerpo, toast = cuerpo || titulo, tipo = "info" }) => {
    showToast(toast, tipo)
    reproducirAvisoSonoroFuerte()

    if (typeof window === "undefined" || !("Notification" in window)) return
    if (permisoNotificacionesRef.current !== "granted") return

    try {
      new window.Notification(titulo, { body: cuerpo })
    } catch {
      // Ignorar si la notificacion falla.
    }
  }

  const activarNotificaciones = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Tu navegador no soporta notificaciones", "warning")
      return
    }

    const permiso = await window.Notification.requestPermission()
    permisoNotificacionesRef.current = permiso
    setPermisoNotificaciones(permiso)

    if (permiso === "granted") {
      showToast("Notificaciones activadas para scorekeeper", "success")
    } else {
      showToast("No se activaron las notificaciones del navegador", "warning")
    }
  }

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

    if (!rondaSeleccionada) return
    cargarDetalleRonda()
  }, [rondaSeleccionada])

  useEffect(() => {
    rondaSeleccionadaRef.current = String(rondaSeleccionada || "")
  }, [rondaSeleccionada])

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    permisoNotificacionesRef.current = window.Notification.permission
    setPermisoNotificaciones(window.Notification.permission)
  }, [])

  useEffect(() => {
    rondaListaNotificadaRef.current = null
  }, [eventoSeleccionado, rondaSeleccionada])

  useEffect(() => {
    if (!rondaSeleccionada) return
    if (!stats?.total) return

    if (stats.pendientes > 0) {
      rondaListaNotificadaRef.current = null
      return
    }

    const claveRonda = String(rondaSeleccionada)
    if (rondaListaNotificadaRef.current === claveRonda) return
    rondaListaNotificadaRef.current = claveRonda

    avisarLocalmente({
      titulo: "Ronda lista para capturar",
      cuerpo: `La ronda ${rondaActual?.numero_ronda || ""} de ${torneoActual?.nombre || "tu torneo"} ya no tiene pendientes.`,
      toast: `Ronda ${rondaActual?.numero_ronda || ""} lista para avanzar`,
      tipo: "success"
    })
  }, [stats?.pendientes, stats?.total, rondaSeleccionada, rondaActual?.numero_ronda, torneoActual?.nombre])

  useEffect(() => {
    const onDataUpdated = async (event) => {
      const detail = event?.detail || {}
      const torneoId = String(detail.torneo_id || "")
      const eventoId = String(detail.evento_id || "")
      const tipo = String(detail.tipo || "")

      if (torneoSeleccionado && torneoId && String(torneoSeleccionado) !== torneoId) {
        return
      }

      const necesitaRefrescarEventos = tipo === "evento_archivado" || tipo === "evento_creado"

      if (!necesitaRefrescarEventos && eventoSeleccionado && eventoId && String(eventoSeleccionado) !== eventoId) {
        return
      }

      await cargarEventosDeTorneo()
      if (eventoSeleccionado) {
        const rondaId = await cargarRondas()
        await cargarStandings()
        if (rondaId) {
          await cargarDetalleRonda(rondaId)
        }
      }
    }

    window.addEventListener("torneo:data-updated", onDataUpdated)
    return () => window.removeEventListener("torneo:data-updated", onDataUpdated)
  }, [torneoSeleccionado, eventoSeleccionado, rondaSeleccionada])

  useEffect(() => {
    if (!eventoSeleccionado) return

    const channel = supabase
      .channel(`admin-rondas-rondas-${eventoSeleccionado}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rondas",
          filter: `evento_id=eq.${eventoSeleccionado}`
        },
        async () => {
          const rondaId = await cargarRondas()
          const rondaObjetivo = String(rondaId || rondaSeleccionadaRef.current || "")
          if (rondaObjetivo) {
            await cargarDetalleRonda(rondaObjetivo)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventoSeleccionado])

  useEffect(() => {
    if (!eventoSeleccionado) return

    const channel = supabase
      .channel(`admin-rondas-matches-${eventoSeleccionado}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `evento_id=eq.${eventoSeleccionado}`
        },
        async () => {
          const rondaObjetivo = String(rondaSeleccionadaRef.current || "")
          if (rondaObjetivo) {
            await cargarDetalleRonda(rondaObjetivo)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventoSeleccionado])

  useEffect(() => {
    if (!eventoSeleccionado) return

    const channel = supabase
      .channel(`admin-rondas-standings-${eventoSeleccionado}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings",
          filter: `evento_id=eq.${eventoSeleccionado}`
        },
        async () => {
          await cargarStandings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventoSeleccionado])

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
      seleccionarRonda("")
      return
    }

    setMensaje("")
    const activa = lista.find(r => r.status === "activa")
    const actual = lista.find(r => String(r.id) === String(rondaSeleccionadaRef.current))
    const ultima = lista[0] || null

    let siguienteRonda = actual || ultima

    if (activa) {
      siguienteRonda = activa
    } else if (!actual) {
      siguienteRonda = ultima
    } else if (ultima && Number(ultima.numero_ronda || 0) > Number(actual.numero_ronda || 0)) {
      siguienteRonda = ultima
    }

    const siguienteRondaId = seleccionarRonda(siguienteRonda?.id || "")
    return siguienteRondaId
  }

  const cargarDetalleRonda = async (rondaIdParam = rondaSeleccionadaRef.current || rondaSeleccionada) => {
    const rondaId = String(rondaIdParam || "")
    if (!rondaId || !eventoSeleccionado) return

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaId)
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
      const rondaId = await cargarRondas()
      await cargarStandings()
      if (rondaId) {
        await cargarDetalleRonda(rondaId)
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
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
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

        {typeof window !== "undefined" && "Notification" in window && permisoNotificaciones !== "granted" && (
          <button
            onClick={activarNotificaciones}
            className="mb-4 w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
          >
            Activar notificaciones para scorekeeper
          </button>
        )}

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Contexto: {torneoActual?.nombre || "Sin torneo"} {" > "} {eventoActual?.fecha || "Sin evento"} {" > "} {rondaActual ? `Ronda ${rondaActual.numero_ronda}` : "Sin ronda"}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
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
                  onClick={() => seleccionarRonda(r.id)}
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <div className="-mx-4 overflow-x-auto sm:mx-0">
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
                          className={`px-2 py-1 text-xs rounded border-2 ${claseBotonResultado(match, match.jugador1_id)}`}
                        >
                          {match.jugador1_nombre}
                        </button>
                        <button
                          onClick={() => actualizarResultadoAdmin(match, match.jugador2_id)}
                          disabled={!match.jugador2_id || rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                          className={`px-2 py-1 text-xs rounded border-2 ${claseBotonResultado(match, match.jugador2_id)}`}
                        >
                          {match.jugador2_nombre}
                        </button>
                        <button
                          onClick={() => actualizarResultadoAdmin(match, "empate")}
                          disabled={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                          className={`px-2 py-1 text-xs rounded border-2 ${claseBotonEmpate(match)}`}
                        >
                          Empate
                        </button>
                      </div>
                      {!match.confirmado && (
                        <div className="mt-2 grid gap-1 text-[11px]">
                          <div className={`rounded border px-2 py-1 ${
                            match.ganador_reportado_1 ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-gray-50 text-gray-500"
                          }`}>
                            Jugador 1 reporto: {resolverEtiquetaReporte(match, normalizarId(match.ganador_reportado_1))}
                          </div>
                          {!!match.jugador2_id && (
                            <div className={`rounded border px-2 py-1 ${
                              match.ganador_reportado_2 ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-gray-200 bg-gray-50 text-gray-500"
                            }`}>
                              Jugador 2 reporto: {resolverEtiquetaReporte(match, normalizarId(match.ganador_reportado_2))}
                            </div>
                          )}
                        </div>
                      )}
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
          <div className="-mx-4 overflow-x-auto sm:mx-0">
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

      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <SubirTDF />
      </div>
    </div>
  )
}
