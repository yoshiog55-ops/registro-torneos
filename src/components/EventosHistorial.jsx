import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import { obtenerEventos, resolverEventoArchivado, setEventoArchivado } from "../utils/evento"

export default function EventosHistorial() {
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState("")
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState("")

  async function cargarTorneos() {
    const { data } = await supabase
      .from("torneos")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true })

    const lista = data || []
    setTorneos(lista)
    if (lista.length > 0) {
      setTorneoSeleccionado(String(lista[0].id))
    }
  }

  async function cargarEventos() {
    const lista = await obtenerEventos(torneoSeleccionado, { includeArchivados: true })
    const enriquecidos = lista.map(ev => ({
      ...ev,
      archivado: resolverEventoArchivado(ev)
    }))
    setEventos(enriquecidos)
  }

  async function toggleArchivado(evento) {
    const persistido = await setEventoArchivado(evento.id, !evento.archivado)
    await cargarEventos()
    setMensaje(
      persistido
        ? (evento.archivado ? "Evento restaurado." : "Evento archivado.")
        : "Se actualizo solo en este navegador. Revisa si falta la columna archivado en la tabla eventos."
    )

    window.dispatchEvent(
      new CustomEvent("torneo:data-updated", {
        detail: { torneo_id: torneoSeleccionado, evento_id: evento.id, tipo: "evento_archivado" }
      })
    )
  }

  useEffect(() => {
    cargarTorneos()
  }, [])

  useEffect(() => {
    if (!torneoSeleccionado) return
    cargarEventos()
  }, [torneoSeleccionado])

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="text-xl font-bold mb-4">Historial de eventos</h2>

      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">Torneo</p>
        <div className="flex flex-wrap gap-2">
          {torneos.map(t => (
            <button
              key={t.id}
              onClick={() => setTorneoSeleccionado(String(t.id))}
              className={`px-3 py-1 rounded-full border text-sm ${
                String(torneoSeleccionado) === String(t.id)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      {mensaje && (
        <div className="mb-3 bg-green-100 text-green-700 p-2 rounded text-sm">
          {mensaje}
        </div>
      )}

      {eventos.length === 0 ? (
        <div className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          No hay eventos para este torneo.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">Fecha</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2">Accion</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map(ev => (
                <tr key={ev.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{ev.fecha}</td>
                  <td className="py-2 pr-2">
                    {ev.archivado ? (
                      <span className="text-amber-700 font-semibold">Archivado</span>
                    ) : (
                      <span className="text-green-700 font-semibold">Visible</span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleArchivado(ev)}
                      className={`px-3 py-1 rounded text-white ${
                        ev.archivado ? "bg-green-600" : "bg-amber-600"
                      }`}
                    >
                      {ev.archivado ? "Desarchivar" : "Archivar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
