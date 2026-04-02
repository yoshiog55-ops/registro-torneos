export default function MatchCard({
  match,
  onReport,
  esAdmin,
  userId,
  reportando = false,
  rondaFinalizada = false
}) {
  const normalizarId = (valor) => {
    if (valor === null || valor === undefined) return null
    const limpio = String(valor).trim()
    if (!limpio) return null
    if (limpio.toLowerCase() === "null") return null
    if (limpio.toLowerCase() === "undefined") return null
    return limpio
  }

  const user = normalizarId(userId)
  const j1 = normalizarId(match.jugador1_id)
  const j2 = normalizarId(match.jugador2_id)
  const esBye = !j2

  const yaReporte =
    (user === j1 && normalizarId(match.ganador_reportado_1)) ||
    (user === j2 && normalizarId(match.ganador_reportado_2))

  const esJugador1 = user === j1
  const esJugador2 = user === j2
  const puedeReportar = esAdmin || esJugador1 || esJugador2
  const bloqueadoPorEstado = rondaFinalizada || (esAdmin ? false : (yaReporte || match.confirmado))

  const ganador = normalizarId(match.ganador_final)
  const esEmpate = match.empate
  const reporte1 = normalizarId(match.ganador_reportado_1)
  const reporte2 = normalizarId(match.ganador_reportado_2)

  const resolverEtiquetaReporte = (reporte) => {
    if (!reporte && !match.empate) return "Sin reporte"
    if (match.empate && !reporte1 && !reporte2) return "Empate"
    if (reporte === j1) return match.jugador1_nombre
    if (reporte === j2) return match.jugador2_nombre
    return "Empate"
  }

  const resolver = (resultado) => {
    onReport(match, resultado)
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow sm:p-5">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold">Mesa {match.mesa}</span>

        {match.estado === "confirmado" && (
          <span className="text-green-600 text-sm font-semibold">
            Confirmado
          </span>
        )}

        {match.estado === "esperando" && (
          <span className="text-blue-600 text-sm font-semibold">
            Esperando rival
          </span>
        )}

        {match.estado === "conflicto" && (
          <span className="text-red-600 text-sm font-semibold">
            Conflicto
          </span>
        )}

        {match.estado === "pendiente" && (
          <span className="text-yellow-600 text-sm font-semibold">
            Pendiente
          </span>
        )}
      </div>

      <div className={`text-center mb-2 ${ganador === j1 ? "font-bold text-green-600" : ""}`}>
        <p>{match.jugador1_nombre}</p>
        <p className="text-xs text-gray-500">{j1 || "-"}</p>
      </div>

      {esBye ? (
        <p className="text-center text-gray-400 font-bold text-lg">BYE</p>
      ) : (
        <p className="text-center text-gray-400">VS</p>
      )}

      {!esBye && (
        <div className={`text-center mb-3 ${ganador === j2 ? "font-bold text-green-600" : ""}`}>
          <p>{match.jugador2_nombre}</p>
          <p className="text-xs text-gray-500">{j2 || "-"}</p>
        </div>
      )}

      {esEmpate && (
        <p className="text-center text-yellow-600 font-bold mb-2">
          Empate
        </p>
      )}

      {!esBye && puedeReportar && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              disabled={reportando || bloqueadoPorEstado}
              onClick={() => j1 && resolver(j1)}
              className={`w-full py-2 rounded border-2 text-sm transition font-semibold sm:text-base ${
                match.confirmado && ganador === j1
                  ? "bg-green-600 text-white border-green-600"
                  : match.estado === "conflicto" &&
                    (normalizarId(match.ganador_reportado_1) === j1 || normalizarId(match.ganador_reportado_2) === j1)
                    ? "border-red-500 text-red-500"
                    : (normalizarId(match.ganador_reportado_1) === j1 || normalizarId(match.ganador_reportado_2) === j1)
                      ? "border-green-600 text-green-600"
                      : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {match.jugador1_nombre}
            </button>

            <button
              disabled={reportando || bloqueadoPorEstado}
              onClick={() => j2 && resolver(j2)}
              className={`w-full py-2 rounded border-2 text-sm transition font-semibold sm:text-base ${
                match.confirmado && ganador === j2
                  ? "bg-green-600 text-white border-green-600"
                  : match.estado === "conflicto" &&
                    (normalizarId(match.ganador_reportado_1) === j2 || normalizarId(match.ganador_reportado_2) === j2)
                    ? "border-red-500 text-red-500"
                    : (normalizarId(match.ganador_reportado_1) === j2 || normalizarId(match.ganador_reportado_2) === j2)
                      ? "border-green-600 text-green-600"
                      : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {match.jugador2_nombre}
            </button>
          </div>

          <button
            disabled={reportando || bloqueadoPorEstado}
            onClick={() => resolver("empate")}
            className={`mt-2 w-full rounded border-2 py-2 text-sm transition font-semibold sm:text-base ${
              match.confirmado && esEmpate
                ? "bg-yellow-500 text-white border-yellow-500"
                : match.estado === "conflicto" && match.empate
                  ? "border-red-500 text-red-500"
                  : match.empate
                    ? "border-yellow-500 text-yellow-600"
                    : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Empate
          </button>
        </div>
      )}

      {esBye && (
        <p className="text-center text-green-600 font-bold">
          BYE - Victoria automatica para <span className="uppercase">{match.jugador1_nombre || "Desconocido"}</span>
        </p>
      )}

      {!esBye && !puedeReportar && (
        <p className="text-center text-xs text-gray-400">
          No participas en este match
        </p>
      )}

      {esAdmin && (
        <p className="text-center text-xs text-blue-500 mt-2">
          Modo administrador
        </p>
      )}

      {match.estado === "esperando" && (
        <p className="text-center text-xs text-blue-500 mt-2">
          Esperando confirmacion del rival
        </p>
      )}

      {match.estado === "conflicto" && (
        <p className="text-center text-xs text-red-500 mt-2">
          Resultados diferentes, requiere revision
        </p>
      )}

      {esAdmin && !match.confirmado && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
          <div className={`rounded-lg border px-3 py-2 ${
            reporte1 ? "border-blue-300 bg-blue-50 text-blue-800" : "border-gray-200 bg-gray-50 text-gray-500"
          }`}>
            Jugador 1 reporto: {resolverEtiquetaReporte(reporte1)}
          </div>
          {!esBye && (
            <div className={`rounded-lg border px-3 py-2 ${
              reporte2 ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-gray-200 bg-gray-50 text-gray-500"
            }`}>
              Jugador 2 reporto: {resolverEtiquetaReporte(reporte2)}
            </div>
          )}
        </div>
      )}

      {reportando && (
        <p className="text-center text-xs text-gray-500 mt-2">
          Guardando resultado...
        </p>
      )}
    </div>
  )
}
