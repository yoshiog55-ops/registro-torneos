import { useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { supabase } from "../supabase"

export default function Home(){

const [busqueda,setBusqueda]=useState("")
const [mensaje,setMensaje]=useState("")
const [jugador,setJugador]=useState(null)

async function buscarJugador(valor){

if(!/^[0-9]+$/.test(valor)){
setMensaje("Solo números permitidos")
return
}

const {data,error}=await supabase
.from("jugadores")
.select("*")
.or(`telefono.eq.${valor},player_id.eq.${valor}`)
.single()

if(error){
setMensaje("Jugador no encontrado")
setJugador(null)
return
}

setJugador(data)
setMensaje("Jugador encontrado")

}

async function inscribir(jugador){

const today=new Date().toISOString().split("T")[0]

const {error}=await supabase
.from("inscripciones")
.insert({
jugador_id:jugador.id
})

if(error){
setMensaje("Jugador ya inscrito hoy")
}else{
setMensaje("Jugador inscrito correctamente")
setJugador(null)
setBusqueda("")
}

}

function iniciarQR(){

const scanner = new Html5QrcodeScanner(
"reader",
{ fps:10, qrbox:250 },
false
)

scanner.render(async (text)=>{

scanner.clear()

setMensaje("QR detectado")

await buscarJugador(text)

}, (error)=>{})

}

return(

<div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">

<h2 className="text-2xl font-bold mb-6 text-center">
Inscripción rápida
</h2>

<input
placeholder="Player ID o Teléfono"
className="border p-3 w-full mb-4 rounded"
value={busqueda}
onChange={(e)=>setBusqueda(e.target.value.replace(/\D/g,''))}
onKeyDown={(e)=>{
if(e.key==="Enter") buscarJugador(busqueda)
}}
/>

<button
onClick={()=>buscarJugador(busqueda)}
className="bg-[#00B7C3] text-white w-full p-3 rounded mb-3"
>
Buscar jugador
</button>

<button
onClick={iniciarQR}
className="bg-gray-800 text-white w-full p-3 rounded mb-4"
>
Escanear QR jugador
</button>

<div id="reader"></div>

{jugador && (

<div className="bg-gray-100 p-4 rounded mb-4">

<p className="font-bold">{jugador.nombre}</p>
<p>Player ID: {jugador.player_id}</p>

<button
onClick={()=>inscribir(jugador)}
className="mt-3 bg-green-600 text-white w-full p-2 rounded"
>
Confirmar inscripción
</button>

</div>

)}

{mensaje && (
<div className="bg-blue-100 text-blue-700 p-3 rounded text-center">
{mensaje}
</div>
)}

</div>

)

}