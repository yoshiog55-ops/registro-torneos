export default function MatchCard({ match, onReport, esAdmin, userId }) {

const user = String(userId || "").trim()
const j1 = String(match.jugador1_id || "").trim()
const j2 = String(match.jugador2_id || "").trim()

// 🔥 BYE: si no hay jugador2
const esBye = match.jugador2_id === null || match.jugador2_id === undefined

const yaReporte =
  (user === j1 && match.ganador_reportado_1) ||
  (user === j2 && match.ganador_reportado_2)

  const esJugador1 = user === j1
  const esJugador2 = user === j2

  const puedeReportar = esAdmin || esJugador1 || esJugador2

  const ganador = match.ganador_final
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
        <p className="text-xs text-gray-500">{match.jugador1_id}</p>
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
        <p className="text-xs text-gray-500">{match.jugador2_id}</p>
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
    disabled={yaReporte || match.confirmado || match.status === "finalizada"}
    onClick={() => onReport(match, match.jugador1_id)}
    className={`flex-1 py-2 rounded border-2 transition font-semibold ${
      
      // 🟢 CONFIRMADO (relleno)
      match.confirmado && ganador === j1
        ? "bg-green-600 text-white border-green-600"

      // 🔴 CONFLICTO (borde rojo)
      : match.estado === "conflicto" &&
        (match.ganador_reportado_1 === j1 || match.ganador_reportado_2 === j1)
        ? "border-red-500 text-red-500"

      // 🟢 SELECCIONADO (solo borde)
      : (match.ganador_reportado_1 === j1 || match.ganador_reportado_2 === j1)
        ? "border-green-600 text-green-600"

      // ⚫ DEFAULT
      : "border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200"
    }`}
  >
    {match.jugador1_nombre}
  </button>

  {/* ================= JUGADOR 2 ================= */}
  <button
   disabled={yaReporte || match.confirmado || match.status === "finalizada"}
    onClick={() => onReport(match, match.jugador2_id)}
    className={`flex-1 py-2 rounded border-2 transition font-semibold ${
      
      // 🟢 CONFIRMADO
      match.confirmado && ganador === j2
        ? "bg-green-600 text-white border-green-600"

      // 🔴 CONFLICTO
      : match.estado === "conflicto" &&
        (match.ganador_reportado_1 === j2 || match.ganador_reportado_2 === j2)
        ? "border-red-500 text-red-500"

      // 🟢 SELECCIONADO
      : (match.ganador_reportado_1 === j2 || match.ganador_reportado_2 === j2)
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
 disabled={yaReporte || match.confirmado || match.status === "finalizada"}
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
          ✅ BYE - Victoria automática
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

    </div>
  )
}