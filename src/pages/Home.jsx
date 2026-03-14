import { useState } from "react"
import { supabase } from "../supabase"
import { Link } from "react-router-dom"

export default function Home(){

const [busqueda,setBusqueda] = useState("")
const [mensaje,setMensaje] = useState("")
const [jugador,setJugador] = useState(null)

async function buscarJugador(valor){

const {data,error} = await supabase
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

async function inscribir(){

const {data:estado} = await supabase
.from("torneo_estado")
.select("*")
.single()

const late = !estado.registro_abierto

const {error} = await supabase
.from("inscripciones")
.insert({

jugador_id: jugador.id,
late: late

})

if(error){

setMensaje("Jugador ya inscrito hoy")

}else{

setMensaje(late ? "Late check-in registrado" : "Jugador inscrito")

setJugador(null)
setBusqueda("")

}

}

return(

<div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">

<div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded text-center text-sm">

Si es la primera vez que te inscribes en esta página,
accede a{" "}

<Link
to="/registro"
className="font-bold underline text-[#0A2540]"
>
registro de jugadores
</Link>

</div>


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
className="bg-[#00B7C3] text-white w-full p-3 rounded mb-4"
>
Buscar jugador
</button>

{jugador && (

<div className="bg-gray-100 p-4 rounded mb-4">

<p className="font-bold">{jugador.nombre}</p>
<p>Player ID: {jugador.player_id}</p>

<button
onClick={inscribir}
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