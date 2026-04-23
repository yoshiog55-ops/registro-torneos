import { useState,useEffect } from "react"
import { supabase } from "../supabase"
import { Link } from "react-router-dom"
import { getMexicoDateInputValue } from "../utils/date"
import { esErrorDuplicado, obtenerEventoActual, asegurarEventoDelDia, desactivarTorneosAntiguos } from "../utils/evento"

export default function Home(){

const [busqueda,setBusqueda] = useState("")
const [mensaje,setMensaje] = useState("")
const [jugador,setJugador] = useState(null)

const [torneos,setTorneos]=useState([])
const [torneoSeleccionado,setTorneoSeleccionado]=useState(null)

useEffect(()=>{

cargarTorneos()

},[])

useEffect(() => {
  const onDataUpdated = async () => {
    await cargarTorneos()
  }

  window.addEventListener("torneo:data-updated", onDataUpdated)
  return () => window.removeEventListener("torneo:data-updated", onDataUpdated)
}, [])

async function cargarTorneos(){

// Desactivar torneos cuya fecha ya pasó
await desactivarTorneosAntiguos()

const {data}=await supabase
.from("torneos")
.select("*")
.eq("activo",true)

if(data){

setTorneos(data)

if(data.length === 0){
setTorneoSeleccionado(null)
return []
}

setTorneoSeleccionado(actual => {
const existeActual = data.some(t => String(t.id) === String(actual))
return existeActual ? actual : data[0].id
})

return data

}

setTorneoSeleccionado(null)
return []

}

function resolverTorneoSeleccionado(listaTorneos, torneoActual){
if(!listaTorneos.length) return null
const activo = listaTorneos.find(t => String(t.id) === String(torneoActual))
return activo?.id || listaTorneos[0].id
}

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

if(!jugador?.id){
setMensaje("Primero busca y selecciona un jugador valido")
return
}

const torneosActualizados = await cargarTorneos()

if(torneosActualizados.length === 0){
setMensaje("No hay torneos activos disponibles")
return
}

const torneoIdFinal = resolverTorneoSeleccionado(torneosActualizados, torneoSeleccionado)
setTorneoSeleccionado(torneoIdFinal)

if(torneosActualizados.length>1 && !torneoIdFinal){

setMensaje("Selecciona el torneo")
return

}

const {data:estado} = await supabase
.from("torneo_estado")
.select("*")
.single()

const late = !estado.registro_abierto

// Primero asegurar que existe evento para hoy
await asegurarEventoDelDia(torneoIdFinal)

// Luego obtener el evento
const evento = await obtenerEventoActual(torneoIdFinal)

if(!evento?.id){
setMensaje("No hay evento activo para este torneo. Solicita al admin crear uno.")
return
}

const fechaHoy = getMexicoDateInputValue()

const { data: existe } = await supabase
.from("inscripciones")
.select("id")
.eq("jugador_id", jugador.id)
.eq("torneo_id", torneoIdFinal)
.eq("fecha", fechaHoy)
.eq("evento_id", evento.id)

if(existe && existe.length > 0){
setMensaje("Jugador ya inscrito en este evento")
return
}

const {error} = await supabase
.from("inscripciones")
.insert({

jugador_id: jugador.id,
torneo_id: torneoIdFinal,
late: late,
fecha: fechaHoy,
pagado: false,
evento_id: evento.id

})

localStorage.setItem("player_id", jugador.player_id)

if(error){
setMensaje(esErrorDuplicado(error) ? "La base de datos aun esta bloqueando inscripciones duplicadas del mismo dia. Hay que ajustar esa restriccion en Supabase." : error.message)

}else{

setMensaje(late ? "Late check-in registrado" : "Jugador inscrito")

setJugador(null)
setBusqueda("")

}

}

return(

<div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-4 shadow sm:p-6 md:p-8">

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

<h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl">
Inscripción rápida
</h2>

<input
type="tel"
inputMode="numeric"
pattern="[0-9]*"
placeholder="Player ID o Teléfono"
className="mb-4 w-full rounded border p-3 text-base"
value={busqueda}
onChange={(e)=>setBusqueda(e.target.value.replace(/\D/g,''))}
onKeyDown={(e)=>{

if(e.key==="Enter") buscarJugador(busqueda)

}}
/>

<button
onClick={()=>buscarJugador(busqueda)}
className="mb-4 w-full rounded bg-[#00B7C3] p-3 text-white"
>
Buscar jugador
</button>

{jugador && (

<div className="mb-4 rounded-xl bg-gray-100 p-4">

<p className="font-bold">{jugador.nombre}</p>
<p>Player ID: {jugador.player_id}</p>

{torneos.length > 1 && (

<div className="mt-3">

<p className="font-bold mb-2 text-sm">
Selecciona el torneo
</p>

<div className="grid gap-2 sm:grid-cols-2">

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
