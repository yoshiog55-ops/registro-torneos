import { useState,useEffect } from "react"
import { supabase } from "../supabase"

export default function TorneosAdmin({volver}){

const [torneos,setTorneos]=useState([])

useEffect(()=>{
cargarTorneos()
},[])

async function cargarTorneos(){

const {data}=await supabase
.from("torneos")
.select("*")
.order("id",{ascending:false})

setTorneos(data)

}

async function crearTorneo(){

const nombre=prompt("Nombre del torneo")
if(!nombre) return

const descripcion=prompt("Descripción")

await supabase
.from("torneos")
.insert({
nombre,
descripcion,
activo:true
})

cargarTorneos()

}

async function editarTorneo(t){

const nombre=prompt("Nombre",t.nombre)
const descripcion=prompt("Descripción",t.descripcion)

await supabase
.from("torneos")
.update({
nombre,
descripcion
})
.eq("id",t.id)

cargarTorneos()

}

async function toggleActivo(t){

await supabase
.from("torneos")
.update({activo:!t.activo})
.eq("id",t.id)

cargarTorneos()

}

async function eliminarTorneo(t){

const confirmar=confirm(`Eliminar torneo ${t.nombre}?`)
if(!confirmar) return

await supabase
.from("torneos")
.delete()
.eq("id",t.id)

cargarTorneos()

}

return(

<div className="space-y-4">

<button
onClick={volver}
className="mb-6 bg-gray-600 text-white px-4 py-2 rounded"
>
← Volver
</button>

<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

<h2 className="text-2xl font-bold">
Administrar Torneos
</h2>

<button
onClick={crearTorneo}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Crear torneo
</button>

</div>

<div className="-mx-3 overflow-x-auto rounded-xl bg-white shadow sm:mx-0">

<table className="min-w-[700px] w-full">

<thead className="bg-gray-200">

<tr>

<th className="p-3 text-left">
Nombre
</th>

<th className="p-3 text-left">
Descripción
</th>

<th className="p-3 text-center">
Estado
</th>

<th className="p-3 text-center">
Editar
</th>

<th className="p-3 text-center">
Eliminar
</th>

</tr>

</thead>

<tbody>

{torneos.map(t=>(

<tr key={t.id} className="border-t">

<td className="p-3 font-semibold">
{t.nombre}
</td>

<td className="p-3">
{t.descripcion}
</td>

<td className="p-3 text-center">

<button
onClick={()=>toggleActivo(t)}
className={`px-3 py-1 rounded text-white ${
t.activo ? "bg-green-600":"bg-gray-500"
}`}
>

{t.activo ? "Activo":"Inactivo"}

</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>editarTorneo(t)}
className="bg-blue-600 text-white px-3 py-1 rounded"
>
Editar
</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>eliminarTorneo(t)}
className="bg-red-600 text-white px-3 py-1 rounded"
>
Eliminar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)

}
