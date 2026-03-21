import { useState,useEffect, useRef } from "react"
import { supabase } from "../supabase"
import ConsultaJugadores from "../components/ConsultaJugadores"
import TorneosAdmin from "../components/TorneosAdmin"
import EventosHistorial from "../components/EventosHistorial"
import AdminRondas from "./AdminRondas"
import { obtenerEventos, crearEvento } from "../utils/evento"
import { showToast } from "../utils/toast"

export default function Admin(){

const [auth,setAuth]=useState(false)
const [email,setEmail]=useState("")
const [password,setPassword]=useState("")
const [mensaje,setMensaje] = useState("")

const [jugadores,setJugadores]=useState([])
const [jugadoresDB,setJugadoresDB]=useState([])

const [vista,setVista]=useState("torneo")
const [busqueda,setBusqueda]=useState("")
const [estado,setEstado]=useState(null)
const [torneos,setTorneos] = useState([])
const [torneoSeleccionado,setTorneoSeleccionado] = useState("ALL")
const [eventos,setEventos] = useState([])
const [eventoSeleccionado,setEventoSeleccionado] = useState("")
const [nuevaFechaEvento,setNuevaFechaEvento] = useState(new Date().toISOString().split("T")[0])

const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
const [jugadorAEliminar, setJugadorAEliminar] = useState(null)

const [ordenCampo,setOrdenCampo]=useState("created_at")
const [ordenDireccion,setOrdenDireccion]=useState("asc")
const torneoSeleccionadoRef = useRef("ALL")
const eventoSeleccionadoRef = useRef("")

useEffect(()=>{

  const savedVista = localStorage.getItem("admin_vista")
  const savedTorneo = localStorage.getItem("admin_torneo")

  if(savedVista){
    setVista(savedVista)
  }

  if(savedTorneo){
    setTorneoSeleccionado(savedTorneo)
  }

  verificarSesion()
  cargarTorneos()

  const channel = supabase
    .channel("inscripciones-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inscripciones"
      },
      () => {
        cargarJugadores({
          torneoSeleccionado: torneoSeleccionadoRef.current,
          eventoSeleccionado: eventoSeleccionadoRef.current
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }

},[])

function cambiarVista(v){
  setVista(v)
  localStorage.setItem("admin_vista", v)
}

async function cargarTorneos(){

const {data} = await supabase
.from("torneos")
.select("*")
.eq("activo",true)

if(data){

setTorneos(data)

if(data){
  setTorneos(data)
}
}
}

async function verificarSesion(){

const {data}=await supabase.auth.getSession()

if(data.session){
setAuth(true)
cargarJugadores()
cargarEstado()
}

}

function ordenarPor(campo){

if(ordenCampo===campo){
setOrdenDireccion(ordenDireccion==="asc"?"desc":"asc")
}else{
setOrdenCampo(campo)
setOrdenDireccion("asc")
}

}

async function quitarInscripcion(){

if(!jugadorAEliminar) return

const {error} = await supabase
.from("inscripciones")
.delete()
.eq("id", jugadorAEliminar.id)

if(error){
setMensaje("Error al quitar jugador")
return
}

setMostrarConfirmacion(false)
setJugadorAEliminar(null)
cargarJugadores()

}

async function toggleCheckin(j){

  await supabase
  .from("inscripciones")
  .update({checkin: !j.checkin})
  .eq("id", j.id)

  cargarJugadores()

}

async function login(){

const {error}=await supabase.auth.signInWithPassword({
email,
password
})

if(!error){
setAuth(true)
cargarJugadores()
cargarEstado()
}

}

async function logout(){

await supabase.auth.signOut()
setAuth(false)

}

async function cargarEstado(){

const {data}=await supabase
.from("torneo_estado")
.select("*")
.single()

setEstado(data)

}

async function cerrarRegistro(){

await supabase
.from("torneo_estado")
.update({registro_abierto:false})
.eq("id",1)

cargarEstado()

}

async function abrirRegistro(){

await supabase
.from("torneo_estado")
.update({registro_abierto:true})
.eq("id",1)

cargarEstado()

}

async function cargarJugadores(filtros = {}){

  const torneoId = filtros.torneoSeleccionado ?? torneoSeleccionadoRef.current ?? torneoSeleccionado
  const eventoId = filtros.eventoSeleccionado ?? eventoSeleccionadoRef.current ?? eventoSeleccionado

  if(!torneoId) return

  const today = new Date().toLocaleDateString("en-CA")

  let query = supabase
    .from("inscripciones")
    .select(`
      id,
      pagado,
      late,
      copiado,
      checkin,
      created_at,
      torneos (
        nombre
      ),
      jugadores (
        player_id,
        nombre,
        anio_nacimiento
      )
    `)
    .eq("fecha", today)

  if(torneoId !== "ALL"){
    query = query.eq("torneo_id", torneoId)
  }

  if(torneoId !== "ALL" && eventoId){
    query = query.eq("evento_id", eventoId)
  }

  const { data, error } = await query

  if(error){
    console.log("ERROR cargarJugadores:", error)
    return
  }

  setJugadores(data || [])
}

async function togglePago(j){

await supabase
.from("inscripciones")
.update({pagado:!j.pagado})
.eq("id",j.id)

cargarJugadores()

}

async function toggleCopiado(j){

await supabase
.from("inscripciones")
.update({copiado:!j.copiado})
.eq("id",j.id)

cargarJugadores()

}

async function cargarJugadoresDB(){

const {data}=await supabase
.from("jugadores")
.select("*")
.order("nombre")

setJugadoresDB(data)

}

async function editarJugador(j){

const nuevoNombre=prompt("Nombre",j.nombre)
const nuevoAnio=prompt("Año nacimiento",j.anio_nacimiento)
const nuevoTelefono=prompt("Telefono",j.telefono)

await supabase
.from("jugadores")
.update({
nombre:nuevoNombre,
anio_nacimiento:nuevoAnio,
telefono:nuevoTelefono
})
.eq("id",j.id)

cargarJugadoresDB()

}

useEffect(() => {
  torneoSeleccionadoRef.current = torneoSeleccionado
  localStorage.setItem("admin_torneo", torneoSeleccionado)
}, [torneoSeleccionado])

useEffect(() => {
  eventoSeleccionadoRef.current = eventoSeleccionado
}, [eventoSeleccionado])

useEffect(()=>{

if(torneoSeleccionado){
cargarJugadores()
}

},[torneoSeleccionado])

useEffect(() => {
  if(!torneoSeleccionado || torneoSeleccionado === "ALL"){
    setEventos([])
    setEventoSeleccionado("")
    return
  }

  cargarEventosPorTorneo()
}, [torneoSeleccionado])

useEffect(() => {
  if(torneoSeleccionado){
    cargarJugadores()
  }
}, [eventoSeleccionado])

async function cargarEventosPorTorneo(){
  if(!torneoSeleccionado || torneoSeleccionado === "ALL") return

  const lista = await obtenerEventos(torneoSeleccionado)
  setEventos(lista || [])

  if((lista || []).length === 0){
    setEventoSeleccionado("")
    return
  }

  const actual = (lista || []).find(ev => String(ev.id) === String(eventoSeleccionado))
  setEventoSeleccionado(String(actual?.id || lista[0].id))
}

async function crearEventoDesdeInscritos(){
  if(!torneoSeleccionado || torneoSeleccionado === "ALL"){
    setMensaje("Selecciona un torneo especifico para crear evento")
    showToast("Selecciona un torneo especifico para crear evento", "warning")
    return
  }

  try{
    const nuevo = await crearEvento(torneoSeleccionado, nuevaFechaEvento)
    setMensaje("Evento creado correctamente")
    showToast("Evento creado correctamente", "success")
    await cargarEventosPorTorneo()
    setEventoSeleccionado(String(nuevo.id))
  }catch(error){
    setMensaje("Error al crear evento: " + error.message)
    showToast("Error al crear evento", "error")
  }
}

const jugadoresFiltrados = jugadores.filter(j =>
j.jugadores.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
j.jugadores.player_id.toLowerCase().includes(busqueda.toLowerCase())
)

const jugadoresOrdenados=[...jugadoresFiltrados].sort((a,b)=>{

let aVal
let bVal

switch(ordenCampo){

case "player_id":
aVal=a.jugadores.player_id
bVal=b.jugadores.player_id
break

case "nombre":
aVal=a.jugadores.nombre
bVal=b.jugadores.nombre
break

case "anio":
aVal=a.jugadores.anio_nacimiento
bVal=b.jugadores.anio_nacimiento
break

case "created_at":
aVal=a.created_at
bVal=b.created_at
break

default:
return 0
}

if(aVal>bVal) return ordenDireccion==="asc"?1:-1
if(aVal<bVal) return ordenDireccion==="asc"?-1:1
return 0

})

if(!auth){

return(

<div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">

<h2 className="text-2xl font-bold mb-6 text-center">
Login administrador
</h2>

<input
placeholder="Email"
className="border p-3 w-full mb-4 rounded"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
type="password"
placeholder="Contraseña"
className="border p-3 w-full mb-4 rounded"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
onClick={login}
className="bg-[#00B7C3] text-white w-full p-3 rounded"
>
Entrar
</button>

</div>

)

}

return(

<div className="max-w-7xl mx-auto px-3 md:px-6">

{mensaje && (
<div className="mb-4 bg-green-100 text-green-700 p-3 rounded text-center">
{mensaje}
</div>
)}

<div className="flex flex-wrap justify-between items-center mb-6 gap-3">

<h1 className="text-2xl md:text-3xl font-bold">
Panel administrador
</h1>

<button
onClick={logout}
className="bg-red-500 text-white px-4 py-2 rounded"
>
Cerrar sesión
</button>

</div>

<div className="flex flex-wrap gap-3 mb-6">

<button
onClick={()=>cambiarVista("torneo")}
className="bg-[#00B7C3] text-white px-4 py-2 rounded"
>
Torneo
</button>

<button
onClick={()=>{cambiarVista("jugadores"); cargarJugadoresDB(); if(torneoSeleccionado === "ALL" && torneos.length > 0) setTorneoSeleccionado(torneos[0].id)}}
className="bg-gray-700 text-white px-4 py-2 rounded"
>
Jugadores
</button>

<button
onClick={()=>cambiarVista("torneos")}

className="bg-purple-700 text-white px-4 py-2 rounded"
>
Torneos
</button>

<button
onClick={()=>cambiarVista("historial")}
className="bg-amber-700 text-white px-4 py-2 rounded"
>
Historial
</button>

<button
onClick={()=>cambiarVista("rondas")}

className="bg-indigo-700 text-white px-4 py-2 rounded"
>
Rondas
</button>

</div>

{vista==="torneo" && (

<div>

<div className="mb-6">
<div className="flex flex-wrap items-center gap-4 mb-6">

<p className="font-bold text-lg">

Estado torneo:

{estado?.registro_abierto
? <span className="text-green-600 ml-2">Registro abierto</span>
: <span className="text-red-600 ml-2">Registro cerrado</span>
}

</p>

{estado?.registro_abierto ? (

<button
onClick={cerrarRegistro}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Cerrar registro
</button>

) : (

<button
onClick={abrirRegistro}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Abrir registro
</button>

)}

<div className="flex items-center gap-2">

<label className="font-bold">
Torneo:
</label>

<select
className="border p-2 rounded"
value={torneoSeleccionado}
onChange={(e)=>setTorneoSeleccionado(e.target.value)}
>

<option value="ALL">Todos los torneos</option>

{torneos.map(t=>(
  <option key={t.id} value={t.id}>
    {t.nombre}
  </option>
))}

</select>

</div>

{torneoSeleccionado !== "ALL" && (
<div className="flex items-center gap-2">

<label className="font-bold">
Evento:
</label>

<select
className="border p-2 rounded"
value={eventoSeleccionado}
onChange={(e)=>setEventoSeleccionado(e.target.value)}
>

<option value="">Todos / sin evento</option>

{eventos.map(ev=>(
  <option key={ev.id} value={ev.id}>
    {ev.fecha}
  </option>
))}

</select>

<input
type="date"
value={nuevaFechaEvento}
onChange={(e)=>setNuevaFechaEvento(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={crearEventoDesdeInscritos}
className="bg-indigo-600 text-white px-3 py-2 rounded"
>
Crear evento
</button>

</div>
)}

<button
onClick={cargarJugadores}
className="bg-gray-700 text-white px-4 py-2 rounded"
>
Recargar
</button>

</div>
</div>

<input
placeholder="Buscar jugador..."
className="border p-3 rounded w-full mb-4"
value={busqueda}
onChange={(e)=>setBusqueda(e.target.value)}
/>

<div className="grid grid-cols-3 gap-3 mb-6">

<div className="bg-white p-4 rounded-xl shadow text-center">
<h3 className="text-gray-500">Inscritos</h3>
<p className="text-2xl font-bold">{jugadores.length}</p>
</div>

<div className="bg-white p-4 rounded-xl shadow text-center">
<h3 className="text-gray-500">Pagados</h3>
<p className="text-2xl font-bold">
{jugadores.filter(j=>j.pagado).length}
</p>
</div>

<div className="bg-white p-4 rounded-xl shadow text-center">
<h3 className="text-gray-500">Pendientes</h3>
<p className="text-2xl font-bold">
{jugadores.filter(j=>!j.pagado).length}
</p>
</div>

</div>

<div className="w-full overflow-x-auto">

<table className="min-w-[900px] w-full bg-white shadow rounded-xl text-sm">

<thead className="bg-gray-200">

<tr>

<th onClick={()=>ordenarPor("player_id")} className="p-3 cursor-pointer">
Player ID
</th>

<th onClick={()=>ordenarPor("nombre")} className="p-3 cursor-pointer">
Nombre
</th>

<th onClick={()=>ordenarPor("anio")} className="p-3 cursor-pointer">
Año
</th>

<th onClick={()=>ordenarPor("created_at")} className="p-3 cursor-pointer">
Fecha inscripción
</th>

<th className="p-3">Torneo</th>

<th className="p-3">Pago</th>

<th className="p-3">Check-in</th>

<th className="p-3">Estado</th>

<th className="p-3">Copiar</th>

<th className="p-3">Inscrito</th>

<th className="p-3">Quitar</th>

</tr>

</thead>

<tbody>

{jugadoresOrdenados.map(j=>(

<tr key={j.id} className={`border-t ${j.late ? "bg-yellow-100" : "odd:bg-gray-50"}`}>

<td className="p-3 text-center">{j.jugadores.player_id}</td>

<td className="p-3">{j.jugadores.nombre}</td>

<td className="p-3 text-center">{j.jugadores.anio_nacimiento}</td>

<td className="p-3 text-center text-xs">
{new Date(j.created_at).toLocaleString("es-MX", {
  timeZone: "America/Mexico_City"
})}
</td>

<td className="p-3 text-center">
  {j.torneos?.nombre || "-"}
</td>

<td className="p-3 text-center">

<button
onClick={()=>togglePago(j)}
className={`px-3 py-1 rounded text-white ${
j.pagado ? "bg-green-600" : "bg-red-600"
}`}
>

{j.pagado ? "Pagado" : "No pagó"}

</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>toggleCheckin(j)}
className={`px-3 py-1 rounded text-white ${
  j.checkin ? "bg-green-600" : "bg-gray-400"
}`}
>

{j.checkin ? "Presente" : "Pendiente"}

</button>

</td>

<td className="p-3 text-center">

{j.late
? <span className="text-yellow-600 font-bold">Late</span>
: <span className="text-green-600">Normal</span>
}

</td>

<td className="p-3 text-center">

<button
onClick={async ()=>{

navigator.clipboard.writeText(j.jugadores.player_id)

await supabase
.from("inscripciones")
.update({copiado:true})
.eq("id",j.id)

setMensaje("Player ID copiado")
setTimeout(()=>setMensaje(""),2000)

cargarJugadores()

}}
className="bg-[#00B7C3] text-white px-3 py-1 rounded"
>
Copiar
</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>toggleCopiado(j)}
className={`px-3 py-1 rounded text-white ${
j.copiado ? "bg-green-600" : "bg-gray-400"
}`}
>

{j.copiado ? "Inscrito" : "Pendiente"}

</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>{
  setJugadorAEliminar(j)
  setMostrarConfirmacion(true)
}}
className="bg-red-600 text-white px-3 py-1 rounded"
>
Quitar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)}

{vista==="jugadores" && (

<ConsultaJugadores
  volver={()=>setVista("torneo")}
  torneoSeleccionado={torneoSeleccionado}
  eventoSeleccionado={eventoSeleccionado}
/>

)}

{vista==="torneos" && (

<TorneosAdmin volver={()=>setVista("torneo")} />

)}

{vista==="historial" && (

<EventosHistorial />

)}

{vista==="rondas" && (

<AdminRondas />

)}

{mostrarConfirmacion && jugadorAEliminar && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

    <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center">

      <p className="mb-4 font-bold">
        ¿Quitar a {jugadorAEliminar.jugadores.nombre} del torneo?
      </p>

      <div className="flex gap-3 justify-center">

        <button
          onClick={()=>{
            setMostrarConfirmacion(false)
            setJugadorAEliminar(null)
          }}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Cancelar
        </button>

        <button
          onClick={quitarInscripcion}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Confirmar
        </button>

      </div>

    </div>

  </div>
)}

</div>

)

}

