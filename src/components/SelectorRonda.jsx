export default function SelectorRonda({ rondas, rondaSeleccionada, setRonda }) {
  if (!rondas || rondas.length === 0) {
    return null
  }

  return (
    <div className="mt-3">
      <p className="text-sm font-medium mb-2">Rondas</p>
      <div className="flex flex-wrap gap-2">
        {rondas.map(r => {
          const activa = r.status === "activa"
          const seleccionada = String(rondaSeleccionada) === String(r.id)

          return (
            <button
              key={r.id}
              onClick={() => setRonda(String(r.id))}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                seleccionada
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              R{r.numero_ronda} {activa ? "[Activa]" : "[Finalizada]"}
            </button>
          )
        })}
      </div>
    </div>
  )
}
