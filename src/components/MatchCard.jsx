export default function MatchCard({ match, onReport, esAdmin, userId }) {

  const user = String(userId || "")
  const j1 = String(match.jugador1_id)
  const j2 = String(match.jugador2_id)

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

        {match.confirmado ? (
          <span className="text-green-600 text-sm font-semibold">
            ✔ Confirmado
          </span>
        ) : (
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

      <p className="text-center text-gray-400">VS</p>

      {/* JUGADOR 2 */}
      <div className={`text-center mb-3 ${ganador === j2 ? "font-bold text-green-600" : ""}`}>
        <p>{match.jugador2_nombre}</p>
        <p className="text-xs text-gray-500">{match.jugador2_id}</p>
      </div>

      {/* EMPATE */}
      {esEmpate && (
        <p className="text-center text-yellow-600 font-bold mb-2">
          🤝 Empate
        </p>
      )}

      {/* BOTONES */}
      {puedeReportar && (
        <div className="flex flex-col gap-2">

          <div className="flex gap-2">

            {/* JUGADOR 1 */}
            <button
              onClick={() => onReport(match, match.jugador1_id)}
              className={`flex-1 py-2 rounded text-white transition ${
                ganador === j1 && !esEmpate
                  ? "bg-green-600"
                  : "bg-gray-400"
              }`}
            >
              {match.jugador1_nombre}
            </button>

            {/* JUGADOR 2 */}
            <button
              onClick={() => onReport(match, match.jugador2_id)}
              className={`flex-1 py-2 rounded text-white transition ${
                ganador === j2 && !esEmpate
                  ? "bg-green-600"
                  : "bg-gray-400"
              }`}
            >
              {match.jugador2_nombre}
            </button>

          </div>

          {/* EMPATE */}
          <button
            onClick={() => onReport(match, "empate")}
            className={`w-full py-2 rounded text-white transition ${
              esEmpate
                ? "bg-yellow-500"
                : "bg-gray-400"
            }`}
          >
            Empate
          </button>

        </div>
      )}

      {/* BLOQUEO VISUAL */}
      {!puedeReportar && (
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

    </div>
  )
}