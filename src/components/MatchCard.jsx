export default function MatchCard({ match, onReport, esAdmin, userId, reportando = false, rondaFinalizada = false }) {

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

// 🔥 BYE: si no hay jugador2
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

  return (
    <div className="bg-white p-4 rounded-xl shadow">

      {/* HEADER */}
      <div className="flex justify-between mb-2">
        <span className="font-bold">Mesa {match.mesa}</span>

{match.estado === "confirmado" && (
  <span className="text-green-600 text-sm font-semibold">
    ✔ Confirmado
  </span>
)}

{match.estado === "esperando" && (
  <span className="text-blue-600 text-sm font-semibold">
    ⏳ Esperando rival
  </span>
)}

{match.estado === "conflicto" && (
  <span className="text-red-600 text-sm font-semibold">
    ⚠️ Conflicto
  </span>
)}

{match.estado === "pendiente" && (
  <span className="text-yellow-600 text-sm font-semibold">
    ⏳ Pendiente
  </span>
)}
      </div>

      {/* JUGADOR 1 */}
      <div className={`text-center mb-2 ${ganador === j1 ? "font-bold text-green-600" : ""}`}>
        <p>{match.jugador1_nombre}</p>
        <p className="text-xs text-gray-500">{j1 || "-"}</p>
      </div>

      {esBye ? (
        <p className="text-center text-gray-400 font-bold text-lg">🎯 BYE</p>
      ) : (
        <p className="text-center text-gray-400">VS</p>
      )}

      {/* JUGADOR 2 */}
      {!esBye && (
      <div className={`text-center mb-3 ${ganador === j2 ? "font-bold text-green-600" : ""}`}>
        <p>{match.jugador2_nombre}</p>
        <p className="text-xs text-gray-500">{j2 || "-"}</p>
      </div>
      )}

      {/* EMPATE */}
      {esEmpate && (
        <p className="text-center text-yellow-600 font-bold mb-2">
          🤝 Empate
        </p>
      )}

      {/* BOTONES */}
      {!esBye && puedeReportar && (
        <div className="flex flex-col gap-2">

<div className="flex gap-2">

  {/* ================= JUGADOR 1 ================= */}
  <button
    disabled={reportando || bloqueadoPorEstado}
    onClick={() => j1 && onReport(match, j1)}
    className={`flex-1 py-2 rounded border-2 transition font-semibold ${
      
      // 🟢 CONFIRMADO (relleno)
      match.confirmado && ganador === j1
        ? "bg-green-600 text-white border-green-600"

      // 🔴 CONFLICTO (borde rojo)
      : match.estado === "conflicto" &&
        (normalizarId(match.ganador_reportado_1) === j1 || normalizarId(match.ganador_reportado_2) === j1)
        ? "border-red-500 text-red-500"

      // 🟢 SELECCIONADO (solo borde)
      : (normalizarId(match.ganador_reportado_1) === j1 || normalizarId(match.ganador_reportado_2) === j1)
        ? "border-green-600 text-green-600"

      // ⚫ DEFAULT
      : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
    }`}
  >
    {match.jugador1_nombre}
  </button>

  {/* ================= JUGADOR 2 ================= */}
  <button
   disabled={reportando || bloqueadoPorEstado}
    onClick={() => j2 && onReport(match, j2)}
    className={`flex-1 py-2 rounded border-2 transition font-semibold ${
      
      // 🟢 CONFIRMADO
      match.confirmado && ganador === j2
        ? "bg-green-600 text-white border-green-600"

      // 🔴 CONFLICTO
      : match.estado === "conflicto" &&
        (normalizarId(match.ganador_reportado_1) === j2 || normalizarId(match.ganador_reportado_2) === j2)
        ? "border-red-500 text-red-500"

      // 🟢 SELECCIONADO
      : (normalizarId(match.ganador_reportado_1) === j2 || normalizarId(match.ganador_reportado_2) === j2)
        ? "border-green-600 text-green-600"

      // ⚫ DEFAULT
      : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
    }`}
  >
    {match.jugador2_nombre}
  </button>

</div>

{/* ================= EMPATE ================= */}
<button
 disabled={reportando || bloqueadoPorEstado}
  onClick={() => onReport(match, "empate")}
  className={`w-full py-2 rounded border-2 mt-2 transition font-semibold ${
    
    // 🟢 CONFIRMADO
    match.confirmado && esEmpate
      ? "bg-yellow-500 text-white border-yellow-500"

    // 🔴 CONFLICTO
    : match.estado === "conflicto" && match.empate
      ? "border-red-500 text-red-500"

    // 🟡 SELECCIONADO
    : match.empate
      ? "border-yellow-500 text-yellow-600"

    // ⚫ DEFAULT
    : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
  }`}
>
  Empate
</button>

        </div>
      )}

      {/* BYE CONFIRMADO */}
      {esBye && (
        <p className="text-center text-green-600 font-bold">
          ✅ BYE - Victoria automática para <span className="uppercase">{match.jugador1_nombre || "Desconocido"}</span>
        </p>
      )}

      {/* BLOQUEO VISUAL */}
      {!esBye && !puedeReportar && (
        <p className="text-center text-xs text-gray-400">
          No participas en este match
        </p>
      )}

      {/* INDICADOR ADMIN */}
      {esAdmin && (
        <p className="text-center text-xs text-blue-500 mt-2">
          Modo administrador
        </p>
      )}

{match.estado === "esperando" && (
  <p className="text-center text-xs text-blue-500 mt-2">
    Esperando confirmación del rival
  </p>
)}

{match.estado === "conflicto" && (
  <p className="text-center text-xs text-red-500 mt-2">
    ⚠️ Resultados diferentes, requiere revisión
  </p>
)}

{reportando && (
  <p className="text-center text-xs text-gray-500 mt-2">
    Guardando resultado...
  </p>
)}

    </div>
  )
}
