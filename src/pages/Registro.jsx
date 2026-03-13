import { useState } from "react"
import { supabase } from "../supabase"

export default function Registro(){

const [playerId,setPlayerId]=useState("")
const [nombre,setNombre]=useState("")
const [anio,setAnio]=useState("")
const [telefono,setTelefono]=useState("")
const [mensaje,setMensaje]=useState("")

function validar(){

if(!/^[0-9]+$/.test(playerId)){
setMensaje("Player ID solo debe contener números")
return false
}

if(!/^[0-9]+$/.test(telefono)){
setMensaje("Teléfono solo debe contener números")
return false
}

if(!/^[0-9]{4}$/.test(anio)){
setMensaje("El año debe tener 4 dígitos")
return false
}

if(!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre)){
setMensaje("El nombre solo debe contener letras")
return false
}

return true

}

async function registrar(){

if(!validar()) return

// verificar si ya existe jugador

const { data:existe } = await supabase
.from("jugadores")
.select("id")
.or(`player_id.eq.${playerId},telefono.eq.${telefono}`)

if(existe && existe.length > 0){

setMensaje("Jugador ya registrado")

return

}

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

setPlayerId("")
setNombre("")
setAnio("")
setTelefono("")

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
value={playerId}
onChange={(e)=>setPlayerId(e.target.value.replace(/\D/g,''))}
/>

<input
placeholder="Nombre"
className="border p-3 w-full mb-3 rounded"
value={nombre}
onChange={(e)=>setNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g,''))}
/>

<input
placeholder="Año nacimiento"
className="border p-3 w-full mb-3 rounded"
value={anio}
maxLength="4"
onChange={(e)=>setAnio(e.target.value.replace(/\D/g,''))}
/>

<input
placeholder="Teléfono"
className="border p-3 w-full mb-4 rounded"
value={telefono}
onChange={(e)=>setTelefono(e.target.value.replace(/\D/g,''))}
/>

<button
onClick={registrar}
className="bg-blue-600 text-white w-full p-3 rounded"
>
Registrar jugador
</button>

{mensaje && (

<div className="mt-4 bg-yellow-100 text-yellow-700 p-3 rounded text-center">
{mensaje}
</div>

)}

</div>

)

}