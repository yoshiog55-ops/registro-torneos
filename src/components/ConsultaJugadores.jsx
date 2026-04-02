import { useState,useEffect } from "react"
import { supabase } from "../supabase"
import { getMexicoDateInputValue } from "../utils/date"
import { obtenerEventoActual } from "../utils/evento"

export default function ConsultaJugadores({ volver, torneoSeleccionado, eventoSeleccionado }){
    
const [jugadores,setJugadores]=useState([])
const [busqueda,setBusqueda]=useState("")
const [mensaje,setMensaje]=useState("")

const [editando,setEditando]=useState(null)

const [nombre,setNombre]=useState("")
const [anio,setAnio]=useState("")
const [telefono,setTelefono]=useState("")
const [playerId,setPlayerId]=useState("")

useEffect(()=>{
cargarJugadores()
},[])

async function cargarJugadores(){

const {data}=await supabase
.from("jugadores")
.select("*")
.order("nombre")

setJugadores(data)

}

async function inscribirJugador(j){

if(!torneoSeleccionado || torneoSeleccionado === "ALL"){
  setMensaje("Selecciona un torneo especifico para inscribir")
  return
}

const today = getMexicoDateInputValue()
const torneoIdFinal = torneoSeleccionado

const {data:estado}=await supabase
.from("torneo_estado")
.select("*")
.single()

const late = !estado.registro_abierto

let eventoIdFinal = eventoSeleccionado || null

if(!eventoIdFinal){
  const evento = await obtenerEventoActual(torneoIdFinal)
  eventoIdFinal = evento?.id || null
}

if(!eventoIdFinal){
  setMensaje("No hay evento activo disponible para este torneo")
  return
}

let existeQuery = supabase
.from("inscripciones")
.select("id")
.eq("jugador_id",j.id)
.eq("fecha",today)
.eq("torneo_id", torneoIdFinal)
.eq("evento_id", eventoIdFinal)

const {data:existe}=await existeQuery

if(existe.length>0){

setMensaje("Jugador ya inscrito hoy")
return

}

await supabase
.from("inscripciones")
.insert({

jugador_id:j.id,
torneo_id: torneoIdFinal,
fecha: today,
late:late,
evento_id: eventoIdFinal

})

setMensaje("Jugador inscrito correctamente")

}

function abrirEditar(j){

setEditando(j)
setNombre(j.nombre)
setPlayerId(j.player_id)
setAnio(j.anio_nacimiento)
setTelefono(j.telefono)

}

function normalizarBusqueda(texto){
return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

async function guardarCambios(){

if(!editando?.id){
  setMensaje("No hay jugador seleccionado para editar")
  return
}

if(!/^[0-9]+$/.test(playerId)){
  setMensaje("Player ID solo debe contener numeros")
  return
}

const playerIdAnterior = String(editando.player_id || "")
const playerIdNuevo = String(playerId || "")

const { error } = await supabase
.from("jugadores")
.update({
nombre,
player_id: playerIdNuevo,
anio_nacimiento:anio,
telefono
})
.eq("id",editando.id)

if(error){
  if(error.code === "23505"){
    setMensaje("Ese Player ID ya existe en otro jugador")
    return
  }

  setMensaje("No se pudo actualizar el jugador: " + error.message)
  return
}

if(playerIdAnterior && playerIdAnterior !== playerIdNuevo){
  const actualizaciones = await Promise.all([
    supabase
      .from("standings")
      .update({ player_id: playerIdNuevo })
      .eq("player_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ jugador1_id: playerIdNuevo })
      .eq("jugador1_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ jugador2_id: playerIdNuevo })
      .eq("jugador2_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_reportado_1: playerIdNuevo })
      .eq("ganador_reportado_1", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_reportado_2: playerIdNuevo })
      .eq("ganador_reportado_2", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_final: playerIdNuevo })
      .eq("ganador_final", playerIdAnterior)
  ])

  const errorRelacionada = actualizaciones.find(item => item.error)?.error

  if(errorRelacionada){
    setMensaje("Jugador actualizado, pero no se pudo propagar el nuevo Player ID a todas las tablas: " + errorRelacionada.message)
    await cargarJugadores()
    return
  }

  const playerIdGuardado = localStorage.getItem("player_id")
  if(String(playerIdGuardado) === playerIdAnterior){
    localStorage.setItem("player_id", playerIdNuevo)
  }
}

setMensaje("Jugador actualizado correctamente")

setEditando(null)

await cargarJugadores()

}

return(

<div>
<div className="flex justify-between items-center mb-4">

<button
onClick={volver}
className="bg-gray-600 text-white px-4 py-2 rounded"
>
Volver
</button>

<h2 className="text-xl font-bold">
Consulta de jugadores
</h2>

</div>

<input
placeholder="Buscar jugador (nombre, player ID o telefono)"
className="border p-3 mb-4 rounded w-full"
onChange={(e)=>setBusqueda(e.target.value)}
/>

{mensaje && (
<div className="mb-4 bg-green-100 text-green-700 p-3 rounded text-center">
{mensaje}
</div>
)}

<div className="w-full overflow-x-auto">

<table className="min-w-[720px] w-full bg-white shadow rounded-xl text-sm md:text-base">

<thead className="bg-gray-200">

<tr>
<th className="p-3 text-center">Player ID</th>
<th className="p-3 text-center">Nombre</th>
<th className="p-3 text-center">Anio</th>
<th className="p-3 text-center">Telefono</th>
<th className="p-3 text-center">Inscribir</th>
<th className="p-3 text-center">Editar</th>
</tr>

</thead>

<tbody>

{jugadores
.filter(j =>
(j.nombre && normalizarBusqueda(j.nombre).includes(normalizarBusqueda(busqueda))) ||
(j.player_id && normalizarBusqueda(j.player_id).includes(normalizarBusqueda(busqueda))) ||
(j.telefono && normalizarBusqueda(j.telefono).includes(normalizarBusqueda(busqueda)))
)
.map(j=>(

<tr key={j.id} className="border-t odd:bg-gray-50">

<td className="p-3 text-center">{j.player_id}</td>

<td className="p-3 whitespace-nowrap">
{j.nombre}
</td>

<td className="p-3 text-center">{j.anio_nacimiento}</td>

<td className="p-3 text-center">{j.telefono}</td>

<td className="p-3 text-center">

<button
onClick={()=>inscribirJugador(j)}
className="bg-green-600 text-white px-3 py-1 md:px-4 md:py-2 rounded text-xs md:text-sm"
>
Inscribir
</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>abrirEditar(j)}
className="bg-blue-600 text-white px-3 py-1 md:px-4 md:py-2 rounded text-xs md:text-sm"
>
Editar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

{/* POPUP EDITAR */}

{editando && (

<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">

<div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">

<h2 className="text-xl font-bold mb-4">
Editar jugador
</h2>

<input
className="border p-3 w-full mb-3 rounded"
value={playerId}
onChange={(e)=>setPlayerId(e.target.value.replace(/\D/g,''))}
placeholder="Player ID"
/>

<input
className="border p-3 w-full mb-3 rounded"
value={nombre}
onChange={(e)=>setNombre(e.target.value)}
placeholder="Nombre"
/>

<input
className="border p-3 w-full mb-3 rounded"
value={anio}
onChange={(e)=>setAnio(e.target.value.replace(/\D/g,''))}
placeholder="Anio nacimiento"
maxLength="4"
/>

<input
className="border p-3 w-full mb-4 rounded"
value={telefono}
onChange={(e)=>setTelefono(e.target.value.replace(/\D/g,''))}
placeholder="Telefono"
/>

<div className="flex gap-3">

<button
onClick={guardarCambios}
className="bg-green-600 text-white px-4 py-2 rounded w-full"
>
Guardar
</button>

<button
onClick={()=>setEditando(null)}
className="bg-gray-500 text-white px-4 py-2 rounded w-full"
>
Cancelar
</button>

</div>

</div>

</div>

)}

</div>

)

}
