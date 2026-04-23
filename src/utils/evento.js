import { supabase } from "../supabase"
import { getMexicoDateInputValue } from "./date"

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

export function esErrorDuplicado(error) {
  return error?.code === "23505"
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

export async function obtenerEventoActual(torneo_id, opciones = {}) {
  const { includeArchivados = false, fecha = getMexicoDateInputValue() } = opciones
  const lista = await obtenerEventos(torneo_id, { includeArchivados: true })

  const eventoDelDia = lista.find(ev => ev.fecha === fecha)
  if (eventoDelDia) {
    return eventoDelDia
  }

  if (includeArchivados) {
    return lista[0] || null
  }

  return lista.find(ev => !resolverEventoArchivado(ev)) || null
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

  if (error) {
    if (esErrorDuplicado(error)) {
      throw new Error("La base de datos aun bloquea multiples eventos del mismo torneo en la misma fecha. Hay que ajustar esa restriccion en Supabase.")
    }
    throw error
  }
  return data
}

/**
 * Asegura que existe un evento para hoy en el torneo especificado.
 * Si no existe, lo crea automáticamente.
 * @param {number} torneo_id - ID del torneo
 * @returns {Promise<boolean>} true si el evento ya existía o fue creado, false si hubo error
 */
export async function asegurarEventoDelDia(torneo_id) {
  try {
    // Validar que torneo_id es válido
    if (!torneo_id) {
      console.error("Error: torneo_id es undefined o null", { torneo_id })
      return false
    }

    const fechaHoy = getMexicoDateInputValue()
    
    // Verificar si ya existe evento para hoy
    const { data: existentes, error: existError } = await supabase
      .from("eventos")
      .select("id, fecha")
      .eq("torneo_id", torneo_id)
      .eq("fecha", fechaHoy)
    
    if (existError) {
      console.error("Error verificando eventos:", existError.message)
      return false
    }

    if (existentes && existentes.length > 0) {
      // Ya existe evento para hoy
      console.log(`✅ Evento ya existe para torneo ${torneo_id} en ${fechaHoy}`)
      return true
    }
    
    // No existe, crear uno
    console.log(`📝 Creando evento para torneo ${torneo_id} en ${fechaHoy}`)
    const evento = await crearEvento(torneo_id, fechaHoy)
    console.log(`✅ Evento creado:`, evento)
    return true
  } catch (error) {
    console.error(`Error asegurando evento para torneo ${torneo_id}:`, error)
    return false
  }
}

/**
 * Desactiva automáticamente torneos cuya fecha de evento ya pasó.
 * Se ejecuta en México timezone.
 * @returns {Promise<number>} Cantidad de torneos desactivados
 */
export async function desactivarTorneosAntiguos() {
  // La activacion de torneos se controla manualmente desde admin.
  // Un evento viejo no debe apagar el torneo, porque el flujo de inscripcion
  // necesita poder crear el evento del dia automaticamente.
  return 0

  try {
    const fechaHoy = getMexicoDateInputValue()
    
    // Obtener todos los torneos activos
    const { data: torneosActivos, error: torneosError } = await supabase
      .from("torneos")
      .select("id, nombre")
      .eq("activo", true)
    
    if (torneosError) {
      console.error("Error obteniendo torneos activos:", torneosError.message)
      return 0
    }

    if (!torneosActivos || torneosActivos.length === 0) {
      return 0
    }
    
    let desactivados = 0
    
    // Para cada torneo, verificar si su evento más reciente es anterior a hoy
    for (const torneo of torneosActivos) {
      const { data: eventos, error: eventosError } = await supabase
        .from("eventos")
        .select("fecha")
        .eq("torneo_id", torneo.id)
        .order("fecha", { ascending: false })
        .limit(1)
      
      if (eventosError) {
        console.warn(`Error obteniendo eventos para torneo ${torneo.id}:`, eventosError.message)
        continue
      }

      if (eventos && eventos.length > 0) {
        const fechaEvento = eventos[0].fecha
        
        // Comparar fechas (formato YYYY-MM-DD)
        if (fechaEvento < fechaHoy) {
          // El evento es anterior a hoy, desactivar el torneo
          const { error } = await supabase
            .from("torneos")
            .update({ activo: false })
            .eq("id", torneo.id)
          
          if (!error) {
            console.log(`✅ Torneo desactivado: ${torneo.nombre} (evento: ${fechaEvento})`)
            desactivados++
          } else {
            console.warn(`⚠️ Error desactivando torneo ${torneo.nombre}:`, error.message)
          }
        }
      }
    }
    
    return desactivados
  } catch (error) {
    console.error("Error desactivando torneos antiguos:", error.message)
    return 0
  }
}
