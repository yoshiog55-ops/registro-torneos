const MEXICO_TIME_ZONE = "America/Mexico_City"

function obtenerPartesFecha(dateLike = new Date(), timeZone = MEXICO_TIME_ZONE) {
  const fecha = dateLike instanceof Date ? dateLike : new Date(dateLike)
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(fecha)

  const year = partes.find(parte => parte.type === "year")?.value
  const month = partes.find(parte => parte.type === "month")?.value
  const day = partes.find(parte => parte.type === "day")?.value

  return { year, month, day }
}

function parsearFecha(dateLike) {
  if (dateLike instanceof Date) return dateLike

  const valor = String(dateLike || "").trim()
  if (!valor) return null

  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0))
  }

  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function getMexicoDateInputValue(dateLike = new Date()) {
  const { year, month, day } = obtenerPartesFecha(dateLike)
  return `${year}-${month}-${day}`
}

export function formatDateInMexico(dateLike, locale = "es-MX", options = {}) {
  const fecha = parsearFecha(dateLike)
  if (!fecha) return "Sin fecha"

  return new Intl.DateTimeFormat(locale, {
    timeZone: MEXICO_TIME_ZONE,
    ...options
  }).format(fecha)
}

export function formatEventDate(dateLike, locale = "es-MX") {
  return formatDateInMexico(dateLike, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

export function formatDateTimeInMexico(dateLike, locale = "es-MX") {
  return formatDateInMexico(dateLike, locale, {
    dateStyle: "short",
    timeStyle: "short"
  })
}

/**
 * Verifica si una fecha es "hoy" en zona México
 * @param {string|Date} dateLike - Fecha a comparar (formato YYYY-MM-DD o Date)
 * @returns {boolean} true si es hoy, false caso contrario
 */
export function esHoy(dateLike) {
  const fechaHoy = getMexicoDateInputValue()
  const fechaComparar = typeof dateLike === "string" ? dateLike : getMexicoDateInputValue(dateLike)
  return fechaComparar === fechaHoy
}

export { MEXICO_TIME_ZONE }
