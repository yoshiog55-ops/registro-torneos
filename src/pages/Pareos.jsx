import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabase"
import SelectorRonda from "../components/SelectorRonda"
import MatchCard from "../components/MatchCard"
import { obtenerEventos } from "../utils/evento"
import { showToast } from "../utils/toast"

const normalizarId = (valor) => {
  if (valor === null || valor === undefined) return null
  const limpio = String(valor).trim()
  if (!limpio) return null
  if (limpio.toLowerCase() === "null") return null
  if (limpio.toLowerCase() === "undefined") return null
  return limpio
}

const esUuid = (valor) => {
  const limpio = normalizarId(valor)
  if (!limpio) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(limpio)
}

export default function Pareos() {

  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])

  const [pendientes, setPendientes] = useState([]) // 🔥 NUEVO

  const [userId, setUserId] = useState(null)
  const [inputId, setInputId] = useState("")
  const [jugadorVistaId, setJugadorVistaId] = useState(null)
  const [jugadorVistaNombre, setJugadorVistaNombre] = useState("")
  const [filtroJugadorInput, setFiltroJugadorInput] = useState("")
  const [buscandoJugador, setBuscandoJugador] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)

  const [mensaje, setMensaje] = useState("")
  const [tiempoRestante, setTiempoRestante] = useState(null)
  const [modo, setModo] = useState("rondas")
  const [eventoActual, setEventoActual] = useState(null)
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState("")
  const [torneos, setTorneos] = useState([])
  const [reportandoMatchId, setReportandoMatchId] = useState(null)
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported"
  )
  const rondaSeleccionadaRef = useRef(null)
  const permisoNotificacionesRef = useRef(
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported"
  )
  const audioContextRef = useRef(null)
  const ultimaRondaNotificadaRef = useRef(null)
  const adminRondaListaNotificadaRef = useRef(null)
  const torneoActual = torneos.find(t => String(t.id) === String(torneoSeleccionado)) || null
  const rondaActual = rondas.find(r => String(r.id) === String(rondaSeleccionada)) || null
  // =========================
  // 🔐 INIT
  // =========================
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
    setJugadorVistaId(saved)
    setJugadorVistaNombre(saved)
  }

  // 🔥 obtener torneos activos
  const { data: torneosData } = await supabase
    .from("torneos")
    .select("*")
    .eq("activo", true)

  const listaTorneos = torneosData || []
  setTorneos(listaTorneos)

  if(listaTorneos.length > 0){
    const guardado = localStorage.getItem("pareos_torneo_id")
    const existe = listaTorneos.find(t => String(t.id) === String(guardado))
    const torneoInicial = existe ? existe.id : listaTorneos[0].id
    setTorneoSeleccionado(String(torneoInicial))
  }

}

const reproducirAvisoSonoro = () => {
  if(typeof window === "undefined") return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if(!AudioContextClass) return

  try{
    if(!audioContextRef.current){
      audioContextRef.current = new AudioContextClass()
    }

    const context = audioContextRef.current
    if(context.state === "suspended"){
      context.resume().catch(() => {})
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.setValueAtTime(1174, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.34)
  }catch{
    // Ignorar si el navegador bloquea audio automatico.
  }
}

const avisarLocalmente = ({ titulo, cuerpo, toast = cuerpo || titulo, tipo = "info" }) => {
  showToast(toast, tipo)
  reproducirAvisoSonoro()

  if(typeof window === "undefined" || !("Notification" in window)) return
  if(permisoNotificacionesRef.current !== "granted") return

  try{
    new window.Notification(titulo, { body: cuerpo })
  }catch{
    // Ignorar si la notificacion falla.
  }
}

const activarNotificaciones = async () => {
  if(typeof window === "undefined" || !("Notification" in window)){
    showToast("Tu navegador no soporta notificaciones", "warning")
    return
  }

  const permiso = await window.Notification.requestPermission()
  permisoNotificacionesRef.current = permiso
  setPermisoNotificaciones(permiso)

  if(permiso === "granted"){
    showToast("Notificaciones activadas", "success")
  }else{
    showToast("No se activaron las notificaciones del navegador", "warning")
  }
}

useEffect(() => {
  if (esAdmin) return
  if (userId && !jugadorVistaId) {
    setJugadorVistaId(userId)
    setJugadorVistaNombre(userId)
  }
}, [userId, jugadorVistaId, esAdmin])

  const refrescar = async () => {
    const rondaId = await cargarRondas()

    if(modo === "rondas"){
      await cargarMatches({ rondaId })
    }else{
      await cargarStandings()
    }
  }

  const recargarMatchesConRetry = async (opciones = {}) => {
    await cargarMatches(opciones)
    setTimeout(() => {
      if(modo === "rondas"){
        cargarMatches(opciones)
      }
    }, 350)
  }

useEffect(() => {

  // 🧹 limpiar TODO
  setRondas([])
  setRondaSeleccionada(null)
  setMatches([])
  setStandings([])
  setPendientes([])
  setModo("rondas")
  setEventoActual(null)
  setEventos([])
  setEventoSeleccionado("")

  if(!torneoSeleccionado) return

  async function cargarEventosPorTorneo(){
    const lista = await obtenerEventos(torneoSeleccionado)
    setEventos(lista)

    if(lista.length === 0){
      setEventoSeleccionado("")
      setEventoActual(null)
      return
    }

    const guardadoEvento = localStorage.getItem(`pareos_evento_id_${torneoSeleccionado}`)
    const existeEvento = lista.find(ev => String(ev.id) === String(guardadoEvento))
    const eventoInicial = existeEvento || lista[0]

    setEventoSeleccionado(String(eventoInicial.id))
    setEventoActual(eventoInicial)
  }

  cargarEventosPorTorneo()
}, [torneoSeleccionado])

useEffect(() => {
  if(torneoSeleccionado){
    localStorage.setItem("pareos_torneo_id", String(torneoSeleccionado))
  }
}, [torneoSeleccionado])

useEffect(() => {
  if(torneoSeleccionado && eventoSeleccionado){
    localStorage.setItem(
      `pareos_evento_id_${torneoSeleccionado}`,
      String(eventoSeleccionado)
    )
  }
}, [torneoSeleccionado, eventoSeleccionado])

useEffect(() => {
  const onDataUpdated = async (event) => {
    const detail = event?.detail || {}
    const torneoId = String(detail.torneo_id || "")
    const eventoId = String(detail.evento_id || "")

    if(torneoId && String(torneoSeleccionado) !== torneoId) return
    if(eventoId && String(eventoSeleccionado) !== eventoId) return
    if(!esUuid(eventoActual?.id)) return

    const rondaId = await cargarRondas()
    await recargarMatchesConRetry({ rondaId })
    await cargarStandings()
  }

  window.addEventListener("torneo:data-updated", onDataUpdated)
  return () => window.removeEventListener("torneo:data-updated", onDataUpdated)
}, [torneoSeleccionado, eventoSeleccionado, eventoActual?.id, modo, rondaSeleccionada])

useEffect(() => {
  if(!eventoSeleccionado){
    setEventoActual(null)
    return
  }

  const seleccionado = eventos.find(
    ev => String(ev.id) === String(eventoSeleccionado)
  )

  setEventoActual(seleccionado || null)
}, [eventoSeleccionado, eventos])

useEffect(() => {
  ultimaRondaNotificadaRef.current = null
  adminRondaListaNotificadaRef.current = null
}, [eventoActual?.id])

useEffect(() => {
  if(!eventoActual?.id) return

  cargarRondas()

}, [eventoActual?.id])

useEffect(() => {
  if(typeof window === "undefined" || !("Notification" in window)) return
  permisoNotificacionesRef.current = window.Notification.permission
  setPermisoNotificaciones(window.Notification.permission)
}, [])


useEffect(() => {
  if(rondaSeleccionada){
    rondaSeleccionadaRef.current = rondaSeleccionada
    localStorage.setItem(`ronda_id_${torneoSeleccionado}`, rondaSeleccionada)
  }else{
    rondaSeleccionadaRef.current = null
  }
}, [rondaSeleccionada])

useEffect(() => {
  const rondaId = normalizarId(rondaActual?.id)
  if(!rondaId) return

  const clave = `${eventoActual?.id || "sin-evento"}:${rondaId}`
  if(!ultimaRondaNotificadaRef.current){
    ultimaRondaNotificadaRef.current = clave
    return
  }

  if(ultimaRondaNotificadaRef.current === clave) return
  ultimaRondaNotificadaRef.current = clave

  avisarLocalmente({
    titulo: "Nueva ronda disponible",
    cuerpo: `Ya puedes revisar la ronda ${rondaActual?.numero_ronda || ""} de ${torneoActual?.nombre || "tu torneo"}.`,
    toast: `Nueva ronda disponible: Ronda ${rondaActual?.numero_ronda || ""}`,
    tipo: "info"
  })
}, [rondaActual?.id, rondaActual?.numero_ronda, eventoActual?.id, torneoActual?.nombre])

useEffect(() => {
  if(!esAdmin) return
  if(!esUuid(rondaSeleccionada)) return
  if(matches.length === 0) return
  if(pendientes.length > 0){
    if(adminRondaListaNotificadaRef.current === String(rondaSeleccionada)){
      adminRondaListaNotificadaRef.current = null
    }
    return
  }

  if(adminRondaListaNotificadaRef.current === String(rondaSeleccionada)) return
  adminRondaListaNotificadaRef.current = String(rondaSeleccionada)

  avisarLocalmente({
    titulo: "Ronda lista para avanzar",
    cuerpo: `La ronda ${rondaActual?.numero_ronda || ""} ya no tiene matches pendientes. Puedes generar la siguiente ronda.`,
    toast: `Ronda ${rondaActual?.numero_ronda || ""} lista para generar la siguiente`,
    tipo: "success"
  })
}, [esAdmin, matches.length, pendientes.length, rondaSeleccionada, rondaActual?.numero_ronda])

useEffect(() => {

  if(!esUuid(eventoActual?.id)) return
  if(!esUuid(rondaSeleccionada)) return
  if(modo !== "rondas") return

  cargarMatches()

}, [rondaSeleccionada, eventoActual, modo])

  // =========================
  // 📊 RONDAS
  // =========================
const cargarRondas = async () => {
  if(!esUuid(eventoActual?.id)) return

  const { data } = await supabase
    .from("rondas")
    .select("*")
    .eq("evento_id", eventoActual.id)
    .order("numero_ronda", { ascending: false })

  const lista = data || []

  setRondas(lista)

  if(lista.length === 0){
    rondaSeleccionadaRef.current = null
    setRondaSeleccionada(null)
    setMatches([])
    setPendientes([])
    return null
  }

  // 🔥 NUEVO: validar ronda seleccionada
  if(lista.length > 0){
    const existe = lista.find(r => r.id === rondaSeleccionada)

    if(existe){
      rondaSeleccionadaRef.current = existe.id
    }else{
      rondaSeleccionadaRef.current = lista[0].id
      setRondaSeleccionada(lista[0].id)
    }
  }

  const activa = lista.find(r => r.status === "activa")

  if(activa){
    setModo("rondas")

    setRondaSeleccionada(prev => {
      if(prev !== activa.id){
        rondaSeleccionadaRef.current = activa.id
        return activa.id
      }
      return prev
    })

  }else{

    // 🔥 siempre mantener rondas visibles
    setModo("rondas")

    // 🔥 seleccionar última ronda jugada
    if(lista.length > 0){
      setRondaSeleccionada(prev => {
        if(prev !== lista[0].id){
          rondaSeleccionadaRef.current = lista[0].id
          return lista[0].id
        }
        return prev
      })
    }

    // 🔥 cargar standings si existen
    const { data: standingsData } = await supabase
      .from("standings")
      .select("id")
      .eq("evento_id", eventoActual.id)
      .limit(1)

    if(standingsData && standingsData.length > 0){
      await cargarStandings()
      setModo("standings")
    }
  }
}

  // =========================
  // 📊 MATCHES
  // =========================
  const cargarMatches = async () => {
    const eventoId = normalizarId(eventoActual?.id)
    const rondaId = normalizarId(rondaSeleccionadaRef.current || rondaSeleccionada)

    if(!esUuid(eventoId) || !esUuid(rondaId)){
      setMatches([])
      setPendientes([])
      return
    }

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("ronda_id", rondaId)
      .eq("evento_id", eventoId)
      .order("mesa", { ascending: true })

    if(error){
      console.error("Error en matches", error)
      setMensaje(`❌ Error al cargar matches: ${error.message}`)
      setMatches([])
      setPendientes([])
      return
    }

    if(!data){
      setMatches([])
      setPendientes([])
      return
    }

    const ids = [
      ...new Set(
        data
          .flatMap(m => [m.jugador1_id, m.jugador2_id])
          .map(normalizarId)
          .filter(Boolean)
      )
    ]

    let jugadores = []
    if(ids.length > 0){
      const { data: jugadoresData } = await supabase
        .from("jugadores")
        .select("player_id, nombre")
        .in("player_id", ids)

      jugadores = jugadoresData || []
    }

    const mapa = {}
    jugadores?.forEach(j => {
      mapa[j.player_id] = j.nombre
    })

let formateado = data.map(m => {

  const j1 = normalizarId(m.jugador1_id)
  const j2 = normalizarId(m.jugador2_id)

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
    jugador1_nombre: mapa[j1] || "Desconocido",
    jugador2_nombre: j2 ? (mapa[j2] || "Desconocido") : "BYE"
  }
})

  const user = normalizarId(jugadorVistaId || userId)

if(!esAdmin && user){
  formateado = formateado.filter(m =>
    normalizarId(m.jugador1_id) === user ||
    normalizarId(m.jugador2_id) === user
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

if(!esUuid(eventoActual?.id)) return
  const channel = supabase
    .channel('matches-global')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `evento_id=eq.${eventoActual.id}`
      },
      async () => {
await cargarRondas()

setTimeout(() => {
  if(modo === "rondas"){
    recargarMatchesConRetry()
  }
}, 300)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [eventoActual, modo])

useEffect(() => {

if(!esUuid(eventoActual?.id)) return
  const channel = supabase
    .channel('standings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'standings',
        filter: `evento_id=eq.${eventoActual.id}` // 🔥 CLAVE
      },
      async () => {
        console.log("🏆 Cambio en standings")
        await cargarStandings()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [eventoActual])

useEffect(() => {

if(!esUuid(eventoActual?.id)) return
  const channel = supabase
    .channel('rondas-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rondas',
        filter: `evento_id=eq.${eventoActual.id}`
      },
      async () => {

        console.log("🔥 Cambio en rondas detectado")

        await cargarRondas()

        // 🔥 CLAVE: recargar matches también
        if(modo === "rondas"){
          await recargarMatchesConRetry()
        }

      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [eventoActual, modo])

useEffect(() => {

if(!esUuid(eventoActual?.id)) return
  const channel = supabase
    .channel('matches-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `evento_id=eq.${eventoActual.id}`
      },
      async () => {

        console.log("🔥 Cambio en matches detectado")

        if(modo === "rondas"){
          await recargarMatchesConRetry()
        }

      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

}, [eventoActual, modo, rondaSeleccionada])

  // =========================
  // 🎯 REPORTAR
  // =========================
  const reportar = async (match, ganador) => {
    setReportandoMatchId(match.id)

    const user = normalizarId(userId)
    const j1 = normalizarId(match.jugador1_id)
    const j2 = normalizarId(match.jugador2_id)
    const rondaActual = rondas.find(r => String(r.id) === String(rondaSeleccionada))

    if(rondaActual?.status === "finalizada"){
      setMensaje("La ronda esta finalizada. Solo consulta.")
      showToast("La ronda esta finalizada. Solo consulta.", "warning")
      setReportandoMatchId(null)
      return
    }

    if(!esAdmin && user !== j1 && user !== j2){
      setMensaje("No puedes reportar este match")
      showToast("No puedes reportar este match", "error")
      setReportandoMatchId(null)
      return
    }

    if(ganador === "empate"){
      if(esAdmin){
        await supabase.from("matches").update({
          empate: true,
          ganador_final: null,
          confirmado: true,
          ganador_reportado_1: null,
          ganador_reportado_2: null
        }).eq("id", match.id)

        await recargarMatchesConRetry()
        showToast("Resultado actualizado por administrador", "success")
        setReportandoMatchId(null)
        return
      }

      await supabase.from("matches").update({
        empate: true,
        ganador_final: null,
        confirmado: false,
        ganador_reportado_1: null,
        ganador_reportado_2: null
      }).eq("id", match.id)

      await recargarMatchesConRetry()
      showToast("Empate reportado, esperando confirmacion", "info")
      setReportandoMatchId(null)
      return
    }

    const ganadorNormalizado = normalizarId(ganador)
    if(!ganadorNormalizado){
      setMensaje("Match invalido: player_id null en pareos. Revisa el TDF cargado.")
      showToast("Match invalido: player_id nulo", "error")
      setReportandoMatchId(null)
      return
    }

    if(esAdmin){
      await supabase.from("matches").update({
        ganador_final: ganadorNormalizado,
        empate: false,
        confirmado: true,
        ganador_reportado_1: ganadorNormalizado,
        ganador_reportado_2: ganadorNormalizado
      }).eq("id", match.id)

      await recargarMatchesConRetry()
      showToast("Resultado actualizado por administrador", "success")
      setReportandoMatchId(null)
      return
    }

    const campo = user === j1 ? "ganador_reportado_1" : "ganador_reportado_2"

    if(!campo){
      setMensaje("No se pudo detectar el jugador que reporta.")
      showToast("No se pudo detectar el jugador que reporta", "error")
      setReportandoMatchId(null)
      return
    }

    setMatches(prev => prev.map(m => {
      if(m.id !== match.id) return m
      return {
        ...m,
        [campo]: ganadorNormalizado,
        estado: "esperando"
      }
    }))

    await supabase.from("matches").update({
      [campo]: ganadorNormalizado,
      empate: false
    }).eq("id", match.id)

    await actualizarConfirmacion(match.id)

    await recargarMatchesConRetry()
    showToast("Resultado reportado correctamente", "success")
    setReportandoMatchId(null)
  }

  const buscarJugadorPorCredencial = async (valor) => {
    const limpio = String(valor || "").replace(/\D/g, "").trim()
    if (!limpio) return null

    const { data, error } = await supabase
      .from("jugadores")
      .select("player_id, nombre")
      .or(`player_id.eq.${limpio},telefono.eq.${limpio}`)
      .limit(1)

    if (error) throw error
    if (!data || data.length === 0) return null
    return data[0]
  }

  const resolverAccesoJugador = async () => {
    const credencial = String(inputId || "").replace(/\D/g, "").trim()
    if (!credencial) {
      showToast("Ingresa player ID o telefono", "warning")
      return
    }

    setBuscandoJugador(true)
    try {
      const jugador = await buscarJugadorPorCredencial(credencial)
      if (!jugador?.player_id) {
        showToast("No encontramos jugador con ese dato", "error")
        return
      }

      const player = String(jugador.player_id)
      localStorage.setItem("player_id", player)
      setUserId(player)
      setJugadorVistaId(player)
      setJugadorVistaNombre(jugador.nombre || player)
      setInputId("")
      showToast("Jugador cargado correctamente", "success")
    } catch (error) {
      showToast(`No se pudo validar jugador: ${error.message}`, "error")
    } finally {
      setBuscandoJugador(false)
    }
  }

  const consultarOtroJugador = async () => {
    const credencial = String(filtroJugadorInput || "").replace(/\D/g, "").trim()
    if (!credencial) {
      showToast("Ingresa player ID o telefono para consultar", "warning")
      return
    }

    setBuscandoJugador(true)
    try {
      const jugador = await buscarJugadorPorCredencial(credencial)
      if (!jugador?.player_id) {
        showToast("No encontramos jugador con ese dato", "error")
        return
      }

      const player = String(jugador.player_id)
      setJugadorVistaId(player)
      setJugadorVistaNombre(jugador.nombre || player)
      setFiltroJugadorInput("")
      showToast(`Mostrando pareos de ${jugador.nombre || player}`, "info")
    } catch (error) {
      showToast(`Error al buscar jugador: ${error.message}`, "error")
    } finally {
      setBuscandoJugador(false)
    }
  }

  const volverAMisPareos = () => {
    if (!userId) return
    setJugadorVistaId(String(userId))
    setFiltroJugadorInput("")
    showToast("Regresaste a tus pareos", "info")
  }

  const matchesPendientesAdmin = esAdmin
    ? matches.filter(match => !match.confirmado)
    : []

  useEffect(() => {
    if (esAdmin) return
    const player = normalizarId(jugadorVistaId)
    if (!player) return

    let cancelado = false

    const cargarNombreJugadorVista = async () => {
      const { data, error } = await supabase
        .from("jugadores")
        .select("nombre")
        .eq("player_id", player)
        .maybeSingle()

      if (cancelado) return
      if (error) return

      const nombre = data?.nombre ? String(data.nombre) : player
      setJugadorVistaNombre(nombre)
    }

    cargarNombreJugadorVista()

    return () => {
      cancelado = true
    }
  }, [jugadorVistaId, esAdmin])

  // =========================
  // PLAYER ID MODAL
  // =========================
  if(!esAdmin && !userId){
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-5 rounded-xl w-[90%] max-w-sm">
          <h3 className="text-center font-bold mb-3">
            Ingresa Player ID o telefono
          </h3>

          <input
            value={inputId}
            onChange={(e)=>setInputId(e.target.value.replace(/\D/g, ""))}
            className="border p-2 w-full rounded mb-3"
            placeholder="Ejemplo: 12345678"
          />

          <button
            onClick={resolverAccesoJugador}
            disabled={buscandoJugador}
            className="bg-blue-600 text-white w-full py-2 rounded"
          >
            {buscandoJugador ? "Validando..." : "Continuar"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {modo === "rondas" && tiempoRestante && (
        <div className="bg-black text-white text-center py-2 rounded mb-3">
          {tiempoRestante}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Pareos</h2>

      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Contexto: {torneoActual?.nombre || "Sin torneo"} {" > "} {eventoActual?.fecha || "Sin evento"} {" > "} {rondaActual ? `Ronda ${rondaActual.numero_ronda}` : "Sin ronda"}
      </div>

      {typeof window !== "undefined" && "Notification" in window && permisoNotificaciones !== "granted" && (
        <button
          onClick={activarNotificaciones}
          className="mb-4 w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
        >
          Activar notificaciones del navegador
        </button>
      )}

      {!esAdmin && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-sm text-indigo-900 mb-2">
            Viendo pareos de: <span className="font-semibold">{jugadorVistaNombre || jugadorVistaId || userId}</span>
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={filtroJugadorInput}
              onChange={(e) => setFiltroJugadorInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Ver otro jugador (ID o telefono)"
              className="border rounded px-3 py-2 flex-1 text-sm"
            />
            <button
              onClick={consultarOtroJugador}
              disabled={buscandoJugador}
              className="bg-indigo-600 text-white px-3 py-2 rounded text-sm"
            >
              {buscandoJugador ? "Buscando..." : "Ver otro jugador"}
            </button>
            {normalizarId(jugadorVistaId) !== normalizarId(userId) && (
              <button
                onClick={volverAMisPareos}
                className="bg-white border border-indigo-300 text-indigo-700 px-3 py-2 rounded text-sm"
              >
                Ver mis pareos
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Paso 1: Torneo</label>
        {torneos.length === 0 ? (
          <div className="border rounded p-3 text-sm text-gray-500 bg-white">
            No hay torneos activos.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {torneos.map(t => (
              <button
                key={`chip-${t.id}`}
                onClick={() => setTorneoSeleccionado(String(t.id))}
                className={`px-3 py-2 rounded-full text-sm border transition ${
                  String(torneoSeleccionado) === String(t.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Paso 2: Evento</label>
        {!torneoSeleccionado ? (
          <div className="border rounded p-3 text-sm text-gray-500 bg-white">
            Selecciona un torneo para ver sus eventos.
          </div>
        ) : eventos.length === 0 ? (
          <div className="border rounded p-3 text-sm text-gray-500 bg-white">
            Este torneo no tiene eventos disponibles.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {eventos.map(e => (
              <button
                key={`evento-chip-${e.id}`}
                onClick={() => setEventoSeleccionado(String(e.id))}
                className={`px-3 py-2 rounded-full text-sm border transition ${
                  String(eventoSeleccionado) === String(e.id)
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-gray-700 border-gray-300 hover:border-slate-400"
                }`}
              >
                {new Date(e.fecha).toLocaleDateString("es-ES", { timeZone: "UTC" })}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={()=>setModo("rondas")}
          className={`px-3 py-2 rounded ${
            modo === "rondas"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Rondas
        </button>

        {standings.length > 0 && (
          <button
            onClick={()=>setModo("standings")}
            className={`px-3 py-2 rounded ${
              modo === "standings"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Standings
          </button>
        )}
      </div>

      <button
        onClick={refrescar}
        className="bg-gray-700 text-white px-4 py-2 rounded mb-4 w-full"
      >
        Refrescar
      </button>

      {pendientes.length > 0 && modo === "rondas" && (
        <div className="bg-yellow-100 p-3 rounded mb-3 text-center">
          Tienes {pendientes.length} match(es) pendientes
        </div>
      )}

      {mensaje && (
        <div className="bg-red-100 text-red-700 p-2 mb-3 rounded text-center">
          {mensaje}
        </div>
      )}

      {modo === "standings" && standings.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-3">Standings</h3>
          {standings.map(s => (
            <div key={s.player_id} className="flex justify-between border-b py-2">
              <span className="w-8 font-bold">#{s.posicion}</span>
              <span className="flex-1">{s.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {modo === "rondas" && (
        <>
          {rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada" && (
            <div className="bg-gray-100 text-gray-700 text-center p-2 rounded mt-2">
              Ronda finalizada: vista de solo consulta.
            </div>
          )}

          <SelectorRonda
            rondas={rondas}
            rondaSeleccionada={rondaSeleccionada}
            setRonda={setRondaSeleccionada}
          />

          {esAdmin && matchesPendientesAdmin.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-3 text-sm font-semibold text-amber-900">
                Pendientes por confirmar: {matchesPendientesAdmin.length}
              </p>
              <div className="space-y-3">
                {matchesPendientesAdmin.map(m => (
                  <MatchCard
                    key={`pendiente-${m.id}`}
                    match={m}
                    onReport={reportar}
                    esAdmin={esAdmin}
                    userId={userId}
                    reportando={reportandoMatchId === m.id}
                    rondaFinalizada={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                  />
                ))}
              </div>
            </div>
          )}

          {matches.length === 0 ? (
            <div className="bg-white p-6 rounded shadow text-center mt-4">
              Sin pareos
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
                  reportando={reportandoMatchId === m.id}
                  rondaFinalizada={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === "finalizada"}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
