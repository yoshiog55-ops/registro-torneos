import { useEffect, useState, useRef } from "react"
import { parseTDF } from "../utils/parseTDF"
import { guardarRonda } from "../service/rondasService"
import { supabase } from "../supabase"
import { obtenerEventos, crearEvento } from "../utils/evento"
import { formatEventDate, getMexicoDateInputValue } from "../utils/date"
import { showToast } from "../utils/toast"

export default function SubirTDF() {
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState("")
  const [nuevaFecha, setNuevaFecha] = useState(getMexicoDateInputValue())

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

  const sincronizarRetirosTDF = async (hastaRonda = Infinity) => {
    const retiros = (preview?.droppedPlayers || []).filter(
      retiro => retiro.ronda <= hastaRonda
    )
    const playerIds = [...new Set(retiros.map(retiro => String(retiro.player_id)))]

    if (playerIds.length === 0) {
      return { retirados: 0, sinInscripcion: [] }
    }

    const { data: jugadores, error: errorJugadores } = await supabase
      .from("jugadores")
      .select("id, player_id")
      .in("player_id", playerIds)

    if (errorJugadores) throw errorJugadores

    const jugadorPorPlayerId = new Map(
      (jugadores || []).map(jugador => [String(jugador.player_id), jugador.id])
    )
    const jugadorIds = [...new Set(
      playerIds.map(playerId => jugadorPorPlayerId.get(playerId)).filter(Boolean)
    )]
    const playerIdsEncontrados = new Set(jugadorPorPlayerId.keys())
    const sinInscripcion = playerIds.filter(playerId => !playerIdsEncontrados.has(playerId))

    if (jugadorIds.length === 0) {
      return { retirados: 0, sinInscripcion }
    }

    const fechaEvento = eventos.find(e => String(e.id) === String(eventoSeleccionado))?.fecha

    let consultaInscripciones = supabase
      .from("inscripciones")
      .select("id, jugador_id, retirado")
      .in("jugador_id", jugadorIds)

    // Inscripciones sin evento_id se vinculan por torneo y fecha del evento
    consultaInscripciones = fechaEvento
      ? consultaInscripciones.or(
          `evento_id.eq.${eventoSeleccionado},and(evento_id.is.null,torneo_id.eq.${torneoSeleccionado},fecha.eq.${fechaEvento})`
        )
      : consultaInscripciones.eq("evento_id", eventoSeleccionado)

    const { data: inscripciones, error: errorInscripciones } = await consultaInscripciones

    if (errorInscripciones) throw errorInscripciones

    const jugadorIdsInscritos = new Set(
      (inscripciones || []).map(inscripcion => inscripcion.jugador_id)
    )
    const playerIdPorJugadorId = new Map(
      [...jugadorPorPlayerId.entries()].map(([playerId, jugadorId]) => [jugadorId, playerId])
    )
    playerIds.forEach(playerId => {
      const jugadorId = jugadorPorPlayerId.get(playerId)
      if (jugadorId && !jugadorIdsInscritos.has(jugadorId)) {
        sinInscripcion.push(playerId)
      }
    })

    const inscripcionesAActualizar = (inscripciones || [])
      .filter(inscripcion => !inscripcion.retirado)
      .map(inscripcion => inscripcion.id)

    if (inscripcionesAActualizar.length > 0) {
      const { error: errorActualizar } = await supabase
        .from("inscripciones")
        .update({ retirado: true })
        .in("id", inscripcionesAActualizar)

      if (errorActualizar) throw errorActualizar
    }

    const idsActualizados = new Set(
      (inscripciones || [])
        .filter(inscripcion => inscripcionesAActualizar.includes(inscripcion.id))
        .map(inscripcion => playerIdPorJugadorId.get(inscripcion.jugador_id))
    )

    return {
      retirados: idsActualizados.size,
      sinInscripcion: [...new Set(sinInscripcion)]
    }
  }

  const mostrarResultadoRetiros = ({ retirados, sinInscripcion }) => {
    if (retirados > 0) {
      showToast(`${retirados} retiro(s) sincronizado(s) desde el TDF`, "success")
    }
    if (sinInscripcion.length > 0) {
      showToast(
        `No se pudieron vincular los retiros de estos Player ID: ${sinInscripcion.join(", ")}`,
        "warning"
      )
    }
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
      let detalleRetiros = ""
      try {
        const resultadoRetiros = await sincronizarRetirosTDF(ronda.numero)
        mostrarResultadoRetiros(resultadoRetiros)
        detalleRetiros = resultadoRetiros.retirados > 0
          ? ` ${resultadoRetiros.retirados} retiro(s) sincronizado(s) desde el TDF.`
          : ""
        if (resultadoRetiros.sinInscripcion.length > 0) {
          detalleRetiros += ` No se pudieron vincular los retiros de estos Player ID: ${resultadoRetiros.sinInscripcion.join(", ")}.`
        }
      } catch (errorRetiros) {
        detalleRetiros = ` La ronda quedó guardada, pero no se pudieron sincronizar los retiros: ${errorRetiros.message}`
        showToast("Ronda guardada, pero falló la sincronización de retiros", "warning")
      }
      setMensaje(`Ronda subida exitosamente.${detalleRetiros}`)
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
          let detalleRetiros = ""
          try {
            const resultadoRetiros = await sincronizarRetirosTDF(ronda.numero)
            mostrarResultadoRetiros(resultadoRetiros)
            detalleRetiros = resultadoRetiros.retirados > 0
              ? ` ${resultadoRetiros.retirados} retiro(s) sincronizado(s) desde el TDF.`
              : ""
            if (resultadoRetiros.sinInscripcion.length > 0) {
              detalleRetiros += ` No se pudieron vincular los retiros de estos Player ID: ${resultadoRetiros.sinInscripcion.join(", ")}.`
            }
          } catch (errorRetiros) {
            detalleRetiros = ` La ronda quedó guardada, pero no se pudieron sincronizar los retiros: ${errorRetiros.message}`
            showToast("Ronda guardada, pero falló la sincronización de retiros", "warning")
          }
          setMensaje(`Ronda ${ronda.numero} reemplazada exitosamente.${detalleRetiros}`)
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
      const resultadoRetiros = await sincronizarRetirosTDF()
      mostrarResultadoRetiros(resultadoRetiros)

      const { data: inscripcionesRetiradas, error: errorInscripcionesRetiradas } = await supabase
        .from("inscripciones")
        .select("jugador_id")
        .eq("evento_id", eventoSeleccionado)
        .eq("retirado", true)

      if (errorInscripcionesRetiradas) {
        throw errorInscripcionesRetiradas
      }

      const jugadorIdsRetirados = (inscripcionesRetiradas || []).map(inscripcion => inscripcion.jugador_id)
      let playerIdsRetirados = new Set()

      if (jugadorIdsRetirados.length > 0) {
        const { data: jugadoresRetirados, error: errorJugadoresRetirados } = await supabase
          .from("jugadores")
          .select("player_id")
          .in("id", jugadorIdsRetirados)

        if (errorJugadoresRetirados) {
          throw errorJugadoresRetirados
        }

        playerIdsRetirados = new Set(
          (jugadoresRetirados || []).map(jugador => String(jugador.player_id))
        )
      }

      // Retirados según el TDF, aunque no tengan inscripción en la app
      ;(preview?.droppedPlayers || []).forEach(retiro => {
        playerIdsRetirados.add(String(retiro.player_id))
      })

      const standingsPreview = preview?.standings || []
      const standingsElegibles = standingsPreview.filter(
        standing => !playerIdsRetirados.has(String(standing.player_id))
      )
      const jugadoresRetiradosExcluidos = standingsPreview.length - standingsElegibles.length
      const nuevosStandings = standingsElegibles.map(s => ({
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

      const mensajeExclusion = jugadoresRetiradosExcluidos > 0
        ? ` Se excluyeron ${jugadoresRetiradosExcluidos} jugador(es) retirado(s); no recibirán tickets por este torneo.`
        : ""
      const mensajeRetirosNoVinculados = resultadoRetiros.sinInscripcion.length > 0
        ? ` No se pudieron vincular los retiros de estos Player ID: ${resultadoRetiros.sinInscripcion.join(", ")}.`
        : ""
      setMensaje(`Standings subidos exitosamente.${mensajeExclusion}${mensajeRetirosNoVinculados}`)
      showToast(
        jugadoresRetiradosExcluidos > 0
          ? `Standings sincronizados. ${jugadoresRetiradosExcluidos} jugador(es) retirado(s) no recibirán tickets.`
          : "Standings sincronizados correctamente",
        "success"
      )

      // Libera a los jugadores del evento para que puedan inscribirse a otro; no toca tickets
      const { error: errorFinalizar } = await supabase
        .from("inscripciones")
        .update({ finalizada: true })
        .eq("evento_id", eventoSeleccionado)
        .eq("finalizada", false)

      if (errorFinalizar) {
        showToast(`Standings subidos, pero no se pudieron liberar las inscripciones: ${errorFinalizar.message}`, "warning")
      }

      await cargarStandings()
      notificarActualizacion("standings_subidos")

      // Los standings ya quedaron guardados; un fallo al pagar no los revierte y se puede reintentar con el botón
      await pagarTickets({ automatico: true })
    } catch (error) {
      setMensaje("Error: " + error.message)
      showToast(`Error al subir standings: ${error.message}`, "error")
    }
    setLoading(false)
  }

  const pagarTickets = async ({ automatico = false } = {}) => {
    if (!eventoSeleccionado) {
      showToast("Selecciona un evento primero", "warning")
      return
    }

    const { data: evento } = await supabase
      .from("eventos")
      .select("tickets_pagados")
      .eq("id", eventoSeleccionado)
      .single()

    if (evento?.tickets_pagados) {
      if (!automatico) showToast("Los tickets de este evento ya fueron pagados", "warning")
      return
    }

    if (!automatico && !window.confirm("¿Pagar tickets de este evento según los standings subidos? Solo se puede hacer una vez.")) return

    if (!automatico) setLoading(true)
    const { error } = await supabase.rpc("pagar_tickets_evento", { p_evento_id: eventoSeleccionado })
    if (!automatico) setLoading(false)

    if (error) {
      setMensaje("Error al pagar tickets: " + error.message)
      showToast(`Standings subidos, pero falló el pago de tickets: ${error.message}`, "error")
      return
    }

    showToast("Tickets pagados correctamente", "success")
    notificarActualizacion("tickets_pagados")
  }

  return (
    <div className="p-1 sm:p-2">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Subir TDF</h2>

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
              {e.fecha} - {formatEventDate(e.fecha, "es-ES")}
            </option>
          ))}
        </select>
      </div>

      {/* Crear Evento */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Nueva Fecha de Evento</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="w-full rounded border p-2 sm:w-auto"
          />
          <button
            onClick={crearNuevoEvento}
            className="rounded bg-blue-500 px-4 py-2 text-white sm:w-auto"
          >
            Crear Evento
          </button>
        </div>
      </div>

      {/* Subir Archivo */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".tdf"
          onChange={handleFileChange}
          className="block w-full max-w-full overflow-hidden rounded border p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {mensaje && <p className="text-red-500 mb-4">{mensaje}</p>}

      {preview && (
        <div className="mb-4 border rounded-xl p-3 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <p className="text-sm text-gray-600 mb-3">
            Rondas detectadas: {preview?.rounds?.length || 0} | Standings: {preview?.standings?.length || 0} | Retiros: {preview?.droppedPlayers?.length || 0}
          </p>
          <p className="mb-3 text-sm font-medium text-amber-700">
            Los jugadores retirados se excluyen de los standings y no reciben tickets.
          </p>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
            {(preview?.rounds || []).map((r, i) => (
              <div key={i} className="flex flex-col gap-2 rounded border bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium">Ronda {r.numero}</span>
                <button
                  onClick={() => subirRonda(i)}
                  disabled={loading}
                  className="rounded bg-green-500 px-3 py-2 text-sm text-white sm:py-1"
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

          <button
            onClick={() => pagarTickets()}
            disabled={loading}
            className="mt-3 ml-2 rounded bg-amber-500 px-4 py-2 text-white"
          >
            Pagar tickets
          </button>
        </div>
      )}

      {/* Resto del componente... */}
    </div>
  )
}
