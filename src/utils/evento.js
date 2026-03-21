import { supabase } from "../supabase"

const ARCHIVE_KEY = "eventos_archivados_map"

function leerMapaArchivados() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function guardarMapaArchivados(mapa) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(mapa))
}

export function esEventoArchivado(eventoId) {
  const mapa = leerMapaArchivados()
  return Boolean(mapa[String(eventoId)])
}

export function resolverEventoArchivado(evento) {
  if (evento && typeof evento === "object" && "archivado" in evento) {
    return Boolean(evento.archivado)
  }
  return esEventoArchivado(evento?.id ?? evento)
}

export async function setEventoArchivado(eventoId, archivado) {
  const mapa = leerMapaArchivados()
  const key = String(eventoId)
  if (archivado) {
    mapa[key] = true
  } else {
    delete mapa[key]
  }
  guardarMapaArchivados(mapa)

  const { error } = await supabase
    .from("eventos")
    .update({ archivado })
    .eq("id", eventoId)

  if (error) {
    console.warn("No se pudo persistir archivado en BD, usando respaldo local.", error.message)
    return false
  }

  return true
}

export async function obtenerEventos(torneo_id, opciones = {}) {
  const { includeArchivados = false } = opciones
  const { data } = await supabase
    .from("eventos")
    .select("*")
    .eq("torneo_id", torneo_id)
    .order("fecha", { ascending: false })

  const lista = data || []
  if (includeArchivados) return lista
  return lista.filter(ev => !resolverEventoArchivado(ev))
}

export async function obtenerEventoActual(torneo_id) {
  const lista = await obtenerEventos(torneo_id)
  return lista[0] || null
}

export async function crearEvento(torneo_id, fecha) {
  const { data, error } = await supabase
    .from("eventos")
    .insert({
      torneo_id,
      fecha
    })
    .select()
    .single()

  if (error) throw error
  return data
}
