export default function SelectorRonda({ rondas, rondaSeleccionada, setRonda }) {
  return (
    <select
      value={rondaSeleccionada || ""}
      onChange={(e) => setRonda(e.target.value)}
      style={{ width: "100%", padding: 10 }}
    >
      {rondas.map(r => (
        <option key={r.id} value={r.id}>
          Ronda {r.numero_ronda} {r.status === "activa" ? "(Actual)" : ""}
        </option>
      ))}
    </select>
  )
}