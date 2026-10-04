import { useState } from "react"
import { supabase } from "../supabase"
import { formatDateTimeInMexico } from "../utils/date"
import { showToast } from "../utils/toast"
import JugadorAutocomplete from "./JugadorAutocomplete"

export default function TicketsHistorial(){

const [jugador,setJugador] = useState(null)
const [movimientos,setMovimientos] = useState([])
const [cargando,setCargando] = useState(false)

async function seleccionar(j){

  setJugador(j)
  setCargando(true)

  const { data, error } = await supabase
    .from("tickets_movimientos")
    .select("*")
    .eq("jugador_id", j.id)
    .order("created_at", { ascending: false })

  setCargando(false)

  if(error){
    showToast("Error al cargar movimientos: " + error.message, "error")
    return
  }

  setMovimientos(data || [])

}

const ganados = movimientos.filter(m => m.cantidad > 0).reduce((s,m) => s + m.cantidad, 0)
const gastados = movimientos.filter(m => m.cantidad < 0).reduce((s,m) => s + m.cantidad, 0)

return(

<div className="space-y-4">

<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

<JugadorAutocomplete onSelect={seleccionar} />

</div>

{jugador && (
<>
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
<p className="text-xs text-slate-500">Jugador</p>
<p className="font-bold">{jugador.nombre}</p>
<p className="text-xs text-gray-400">{jugador.player_id}</p>
</div>
<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
<p className="text-xs text-slate-500">Tickets ganados</p>
<p className="text-2xl font-bold text-green-600">+{ganados}</p>
</div>
<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
<p className="text-xs text-slate-500">Gastados · Saldo actual</p>
<p className="text-2xl font-bold">
<span className="text-red-600">{gastados}</span> · {jugador.tickets} 🎫
</p>
</div>
</div>

<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
<p className="mb-2 font-semibold">Historial de tickets</p>
<div className="divide-y text-sm">
{movimientos.map(m=>(
<div key={m.id} className="flex items-center justify-between py-2">
<div>
<p>{m.motivo}{m.descripcion ? ` · ${m.descripcion}` : ""}</p>
<p className="text-xs text-gray-400">{formatDateTimeInMexico(m.created_at)}</p>
</div>
<p className={`font-bold ${m.cantidad >= 0 ? "text-green-600" : "text-red-600"}`}>
{m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}
</p>
</div>
))}
{!cargando && movimientos.length === 0 && <p className="py-2 text-gray-400">Sin movimientos</p>}
{cargando && <p className="py-2 text-gray-400">Cargando...</p>}
</div>
</div>
</>
)}

</div>

)

}




