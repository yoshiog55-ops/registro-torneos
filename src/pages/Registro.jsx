import { useState,useEffect } from "react"
import { supabase } from "../supabase"

export default function Registro(){

const [playerId,setPlayerId]=useState("")
const [nombre,setNombre]=useState("")
const [anio,setAnio]=useState("")
const [telefono,setTelefono]=useState("")
const [mensaje,setMensaje]=useState("")
const [playerInscrito,setPlayerInscrito]=useState(null)
const [torneos,setTorneos]=useState([])
const [torneoSeleccionado,setTorneoSeleccionado]=useState(null)

useEffect(()=>{

cargarTorneos()

},[])

async function cargarTorneos(){

const {data} = await supabase
.from("torneos")
.select("*")
.eq("activo",true)

if(data){

setTorneos(data)

if(data.length >= 1){
setTorneoSeleccionado(data[0].id)
}
}
}

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

if(torneos.length > 1 && !torneoSeleccionado){
setMensaje("Selecciona el torneo al que deseas inscribirte")
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

// registrar jugador

const { data:jugador, error } = await supabase
.from("jugadores")
.insert({

player_id:playerId,
nombre,
anio_nacimiento:anio,
telefono

})
.select()
.single()

if(error){

setMensaje("Error registrando jugador")
return

}

// revisar estado del torneo

const {data:estado} = await supabase
.from("torneo_estado")
.select("*")
.single()

const late = !estado.registro_abierto

// inscribir automáticamente

const {error:inscripcionError} = await supabase
.from("inscripciones")
.insert({

jugador_id: jugador.id,
torneo_id: torneoSeleccionado,
late: late,
fecha: new Date().toLocaleDateString("en-CA"),
pagado: false

})

if(inscripcionError){

setMensaje("Jugador registrado pero no se pudo inscribir")

}else{

setMensaje("Jugador inscrito correctamente")
setPlayerInscrito(playerId)

}

setPlayerId("")
setNombre("")
setAnio("")
setTelefono("")

}

return(

<div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">

<h2 className="text-2xl font-bold mb-6">
Registro de jugador
</h2>

<input
type="tel"
inputMode="numeric"
pattern="[0-9]*"
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
type="tel"
inputMode="numeric"
pattern="[0-9]*"
placeholder="Año nacimiento"
className="border p-3 w-full mb-3 rounded"
value={anio}
maxLength={4}
onChange={(e)=>setAnio(e.target.value.replace(/\D/g,''))}
/>

<input
type="tel"
inputMode="numeric"
pattern="[0-9]*"
placeholder="Teléfono"
className="border p-3 w-full mb-4 rounded"
value={telefono}
onChange={(e)=>setTelefono(e.target.value.replace(/\D/g,''))}
/>

{torneos.length > 1 && (

<div className="mb-4">

<p className="font-bold mb-2">
Selecciona el torneo
</p>

<div className="grid gap-3">

{torneos.map(t=>{

const seleccionado = torneoSeleccionado === t.id

return(

<div
key={t.id}
onClick={()=>setTorneoSeleccionado(t.id)}
className={`p-3 rounded-lg font-bold cursor-pointer transition text-center border

${seleccionado
? "bg-blue-600 text-white border-blue-700"
: "bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300"
}

`}
>

{t.nombre}

</div>

)

})}

</div>

</div>

)}

<button
onClick={registrar}
className="bg-blue-600 text-white w-full p-3 rounded"
>
Registrar jugador
</button>

{mensaje && (

<div className="mt-4 bg-green-100 text-green-700 p-4 rounded text-center">

<p className="font-bold">{mensaje}</p>

{playerInscrito && (
<p className="mt-2">
Player ID: <span className="font-bold">{playerInscrito}</span>
</p>
)}

</div>

)}

</div>

)

}