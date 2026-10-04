import { useState } from "react"
import { supabase } from "../supabase"
import { showToast } from "../utils/toast"
import JugadorAutocomplete from "./JugadorAutocomplete"

const MOTIVOS = ["Bonificación", "Premio especial", "Ajuste", "Otro"]

export default function AsignarTickets(){

const [jugador,setJugador] = useState(null)
const [cantidad,setCantidad] = useState("")
const [motivo,setMotivo] = useState(MOTIVOS[0])
const [descripcion,setDescripcion] = useState("")
const [guardando,setGuardando] = useState(false)

async function asignar(){

  const n = parseInt(cantidad,10)

  if(!jugador){
    showToast("Selecciona un jugador","error")
    return
  }

  if(!n || n <= 0){
    showToast("La cantidad debe ser mayor a 0","error")
    return
  }

  setGuardando(true)

  const { data, error } = await supabase.rpc("asignar_tickets",{
    p_jugador_id: jugador.id,
    p_cantidad: n,
    p_motivo: "asignacion",
    p_descripcion: [motivo, descripcion.trim()].filter(Boolean).join(" · ")
  })

  setGuardando(false)

  if(error){
    showToast("No se pudieron asignar los tickets: " + error.message,"error")
    return
  }

  showToast(`+${n} tickets para ${jugador.nombre}`,"success")
  setJugador({ ...jugador, tickets: data?.saldo ?? (jugador.tickets || 0) + n })
  setCantidad("")
  setDescripcion("")

}

return(

<div className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

<div>
<p className="mb-2 text-sm font-semibold">Jugador</p>
<JugadorAutocomplete onSelect={setJugador} />
{jugador && (
<div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 p-3 text-white">
<div>
<p className="font-bold">{jugador.nombre}</p>
<p className="text-xs text-slate-300">{jugador.player_id}</p>
</div>
<p className="text-lg font-bold">{jugador.tickets} 🎫</p>
</div>
)}
</div>

<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
<div>
<label className="mb-1 block text-sm font-semibold">Cantidad</label>
<input
type="number"
min="1"
value={cantidad}
onChange={(e)=>setCantidad(e.target.value)}
className="w-full rounded border p-3"
/>
</div>
<div>
<label className="mb-1 block text-sm font-semibold">Motivo</label>
<select value={motivo} onChange={(e)=>setMotivo(e.target.value)} className="w-full rounded border p-3">
{MOTIVOS.map(m=><option key={m}>{m}</option>)}
</select>
</div>
</div>

<div>
<label className="mb-1 block text-sm font-semibold">Descripción (opcional)</label>
<input
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
placeholder="Ej. Ganó torneo casual del sábado"
className="w-full rounded border p-3"
/>
</div>

<button
onClick={asignar}
disabled={guardando}
className="w-full rounded bg-[#00B7C3] p-3 text-white disabled:opacity-50"
>
{guardando ? "Asignando..." : "Asignar tickets"}
</button>

</div>

)

}
