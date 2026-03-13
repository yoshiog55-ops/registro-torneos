import { useEffect,useState } from "react"
import { supabase } from "../supabase"

export default function Admin(){

const [jugadores,setJugadores]=useState([])

useEffect(()=>{

cargar()

},[])

async function cargar(){

const today=new Date().toISOString().split("T")[0]

const {data}=await supabase
.from("inscripciones")
.select(`
id,
pagado,
jugadores (
player_id,
nombre,
anio_nacimiento
)
`)
.eq("fecha",today)

setJugadores(data)

}

async function togglePago(j){

await supabase
.from("inscripciones")
.update({pagado:!j.pagado})
.eq("id",j.id)

cargar()

}

return(

<div className="max-w-5xl mx-auto">

<h1 className="text-3xl font-bold mb-6">
Panel administrador
</h1>

<table className="w-full bg-white shadow rounded-xl">

<thead className="bg-gray-200">

<tr>
<th className="p-3">Player ID</th>
<th className="p-3">Nombre</th>
<th className="p-3">Año</th>
<th className="p-3">Pagó</th>
<th className="p-3">Copiar</th>
</tr>

</thead>

<tbody>

{jugadores.map(j => (

<tr key={j.id} className="border-t">

<td className="p-3 font-semibold">
{j.jugadores.player_id}
</td>

<td className="p-3">
{j.jugadores.nombre}
</td>

<td className="p-3">
{j.jugadores.anio_nacimiento}
</td>

<td className="p-3 text-center">

<input
type="checkbox"
checked={j.pagado}
onChange={()=>togglePago(j)}
/>

</td>

<td className="p-3 text-center">

<button
onClick={()=>navigator.clipboard.writeText(j.jugadores.player_id)}
className="bg-[#00B7C3] text-white px-3 py-1 rounded"
>
Copiar ID
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}