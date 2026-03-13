import { useState } from "react"
import { supabase } from "../supabase"

export default function Registro(){

const [playerId,setPlayerId]=useState("")
const [nombre,setNombre]=useState("")
const [anio,setAnio]=useState("")
const [telefono,setTelefono]=useState("")
const [mensaje,setMensaje]=useState("")

async function registrar(){

const {error}=await supabase
.from("jugadores")
.insert({

player_id:playerId,
nombre,
anio_nacimiento:anio,
telefono

})

if(error){
setMensaje("Error registrando jugador")
}else{
setMensaje("Jugador registrado correctamente")
}

}

return(

<div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">

<h2 className="text-2xl font-bold mb-6">
Registro de jugador
</h2>

<input
placeholder="Player ID"
className="border p-3 w-full mb-3 rounded"
onChange={(e)=>setPlayerId(e.target.value)}
/>

<input
placeholder="Nombre"
className="border p-3 w-full mb-3 rounded"
onChange={(e)=>setNombre(e.target.value)}
/>

<input
placeholder="Año nacimiento"
className="border p-3 w-full mb-3 rounded"
onChange={(e)=>setAnio(e.target.value)}
/>

<input
placeholder="Teléfono"
className="border p-3 w-full mb-4 rounded"
onChange={(e)=>setTelefono(e.target.value)}
/>

<button
onClick={registrar}
className="bg-blue-600 text-white w-full p-3 rounded"
>
Registrar jugador
</button>

{mensaje && (

<div className="mt-4 bg-green-100 text-green-700 p-3 rounded text-center">
{mensaje}
</div>

)}

</div>

)

}