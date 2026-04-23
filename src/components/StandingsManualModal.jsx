import { useEffect, useState } from "react"

function reasignarPosiciones(lista) {
  return lista.map((item, index) => ({
    ...item,
    posicion: index + 1
  }))
}

export default function StandingsManualModal({
  open,
  standings,
  pendientes,
  totalMatches,
  loading,
  onClose,
  onConfirm
}) {
  const [lista, setLista] = useState([])
  const [base, setBase] = useState([])

  useEffect(() => {
    const inicial = reasignarPosiciones(standings || [])
    setLista(inicial)
    setBase(inicial)
  }, [standings, open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = event => {
      if (event.key === "Escape" && !loading) {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, loading, onClose])

  if (!open) return null

  const moverFila = (index, direccion) => {
    const destino = index + direccion
    if (destino < 0 || destino >= lista.length) return

    const copia = [...lista]
    const temporal = copia[index]
    copia[index] = copia[destino]
    copia[destino] = temporal
    setLista(reasignarPosiciones(copia))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Previsualizacion de standings</h3>
              <p className="mt-1 text-sm text-slate-600">
                Se calculan con los resultados confirmados del evento y puedes reordenarlos antes de subirlos.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jugadores</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{lista.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matches del evento</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalMatches}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{pendientes}</p>
            </div>
          </div>

          {pendientes > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Hay matches sin confirmar. El calculo solo toma en cuenta resultados confirmados.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLista(reasignarPosiciones(base))}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Restablecer calculo
            </button>
          </div>

          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-2">Pos</th>
                  <th className="py-2 pr-2">Jugador</th>
                  <th className="py-2 pr-2">Player ID</th>
                  <th className="py-2 pr-2">Pts</th>
                  <th className="py-2 pr-2">W</th>
                  <th className="py-2 pr-2">L</th>
                  <th className="py-2 pr-2">D</th>
                  <th className="py-2">Orden</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((standing, index) => (
                  <tr key={standing.player_id} className="border-b last:border-b-0">
                    <td className="py-3 pr-2 font-semibold text-slate-900">#{standing.posicion}</td>
                    <td className="py-3 pr-2">{standing.nombre}</td>
                    <td className="py-3 pr-2 font-mono text-xs text-slate-600">{standing.player_id}</td>
                    <td className="py-3 pr-2 font-semibold text-slate-900">{standing.matchPoints}</td>
                    <td className="py-3 pr-2">{standing.wins}</td>
                    <td className="py-3 pr-2">{standing.losses}</td>
                    <td className="py-3 pr-2">{standing.draws}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moverFila(index, -1)}
                          disabled={loading || index === 0}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => moverFila(index, 1)}
                          disabled={loading || index === lista.length - 1}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Bajar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(lista)}
            disabled={loading || lista.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Subiendo..." : "Subir standings"}
          </button>
        </div>
      </div>
    </div>
  )
}
