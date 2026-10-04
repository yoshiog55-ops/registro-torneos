import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabase"

export default function JugadorAutocomplete({ onSelect, placeholder = "Buscar jugador por nombre o ID", className = "" }){

const [texto,setTexto] = useState("")
const [resultados,setResultados] = useState([])
const [abierto,setAbierto] = useState(false)
const [cargando,setCargando] = useState(false)
const contenedor = useRef(null)

useEffect(()=>{

  const q = texto.trim().replace(/[,()%]/g," ")
  if(q.length < 2) return

  let cancelado = false

  const timer = setTimeout(async ()=>{

    setCargando(true)

    const { data } = await supabase
      .from("jugadores")
      .select("id, player_id, nombre, tickets")
      .or(`player_id.ilike.%${q}%,nombre.ilike.%${q}%`)
      .order("nombre")
      .limit(8)

    if(cancelado) return

    setCargando(false)
    setResultados(data || [])
    setAbierto(true)

  },250)

  return ()=>{
    cancelado = true
    clearTimeout(timer)
  }

},[texto])

useEffect(()=>{

  function fuera(e){
    if(contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false)
  }

  document.addEventListener("mousedown", fuera)
  return ()=>document.removeEventListener("mousedown", fuera)

},[])

function elegir(j){
  setTexto("")
  setResultados([])
  setAbierto(false)
  onSelect(j)
}

return(

<div ref={contenedor} className={`relative ${className}`}>

<input
value={texto}
onChange={(e)=>{
  setTexto(e.target.value)
  if(e.target.value.trim().length < 2) setResultados([])
}}
onFocus={()=>resultados.length > 0 && setAbierto(true)}
onKeyDown={(e)=>{
  if(e.key==="Enter" && resultados.length > 0) elegir(resultados[0])
  if(e.key==="Escape") setAbierto(false)
}}
placeholder={placeholder}
autoComplete="off"
className="w-full rounded border p-3"
/>

{abierto && texto.trim().length >= 2 && (
<div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded border bg-white shadow-lg">

{resultados.map(j=>(
<button
key={j.id}
type="button"
onClick={()=>elegir(j)}
className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"
>
<span>{j.nombre} <span className="text-xs text-gray-400">{j.player_id}</span></span>
<span className="font-semibold">{j.tickets} 🎫</span>
</button>
))}

{!cargando && resultados.length === 0 && (
<p className="p-3 text-sm text-gray-400">Sin resultados</p>
)}

</div>
)}

</div>

)

}

