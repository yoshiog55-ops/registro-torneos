import { useState,useEffect } from "react"
import { supabase } from "../supabase"

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

useEffect(()=>{

verificarSesion()

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
cargarJugadores()
}
)
.subscribe()

return () => {
supabase.removeChannel(channel)
}

},[])

async function verificarSesion(){

const {data}=await supabase.auth.getSession()

if(data.session){
setAuth(true)
cargarJugadores()
cargarEstado()
}

}

async function quitarInscripcion(j){

const confirmar = confirm(
`¿Quitar a ${j.jugadores.nombre} del torneo?`
)

if(!confirmar) return

await supabase
.from("inscripciones")
.delete()
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

async function cargarJugadores(){

const today = new Date().toLocaleDateString("en-CA")

const {data}=await supabase
.from("inscripciones")
.select(`
id,
pagado,
late,
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

<div className="max-w-6xl mx-auto px-2 md:px-0">

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
onClick={()=>setVista("torneo")}
className="bg-[#00B7C3] text-white px-4 py-2 rounded"
>
Torneo
</button>

<button
onClick={()=>{
setVista("jugadores")
cargarJugadoresDB()
}}
className="bg-gray-700 text-white px-4 py-2 rounded"
>
Jugadores
</button>

</div>

{vista==="torneo" && (

<div>

<div className="mb-6">

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
className="bg-red-600 text-white px-4 py-2 rounded mt-2"
>
Cerrar registro
</button>

) : (

<button
onClick={abrirRegistro}
className="bg-green-600 text-white px-4 py-2 rounded mt-2"
>
Abrir registro
</button>

)}

</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Inscritos</h3>
<p className="text-3xl font-bold">{jugadores.length}</p>
</div>

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Pagados</h3>
<p className="text-3xl font-bold">
{jugadores.filter(j=>j.pagado).length}
</p>
</div>

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Pendientes</h3>
<p className="text-3xl font-bold">
{jugadores.filter(j=>!j.pagado).length}
</p>
</div>

</div>

<div className="overflow-x-auto">

<table className="min-w-[700px] bg-white shadow rounded-xl">

<thead className="bg-gray-200">

<tr>
<th className="p-3">Player ID</th>
<th className="p-3">Nombre</th>
<th className="p-3">Año</th>
<th className="p-3">Pago</th>
<th className="p-3">Estado</th>
<th className="p-3">Copiar</th>
<th className="p-3">Quitar</th>
</tr>

</thead>

<tbody>

{jugadores.map(j=>(

<tr
key={j.id}
className={j.late ? "bg-yellow-100" : ""}
>

<td className="p-3">{j.jugadores.player_id}</td>
<td className="p-3">{j.jugadores.nombre}</td>
<td className="p-3">{j.jugadores.anio_nacimiento}</td>

<td className="p-3">

<button
onClick={()=>togglePago(j)}
className={`w-full py-3 rounded-xl font-bold text-white ${
j.pagado ? "bg-green-600" : "bg-red-600"
}`}
>

{j.pagado ? "✔ Pagado" : "✖ No pagó"}

</button>

</td>

<td className="p-3">

{j.late
? <span className="text-yellow-600 font-bold">Late</span>
: <span className="text-green-600">Normal</span>
}

</td>

<td className="p-3">

<button
onClick={() => {
navigator.clipboard.writeText(j.jugadores.player_id)
setMensaje("Player ID copiado con éxito")
setTimeout(() => setMensaje(""), 2000)
}}
className="bg-[#00B7C3] text-white px-3 py-1 rounded"
>
Copiar
</button>

</td>

<td className="p-3">

<button
onClick={()=>quitarInscripcion(j)}
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

<div>

<input
placeholder="Buscar jugador"
className="border p-2 mb-4 rounded w-full"
onChange={(e)=>setBusqueda(e.target.value)}
/>

<div className="overflow-x-auto">

<table className="min-w-[700px] bg-white shadow rounded-xl">

<thead className="bg-gray-200">

<tr>
<th className="p-3">Player ID</th>
<th className="p-3">Nombre</th>
<th className="p-3">Año</th>
<th className="p-3">Teléfono</th>
<th className="p-3">Editar</th>
</tr>

</thead>

<tbody>

{jugadoresDB
.filter(j=>j.nombre.toLowerCase().includes(busqueda.toLowerCase()))
.map(j=>(

<tr key={j.id} className="border-t">

<td className="p-3">{j.player_id}</td>
<td className="p-3">{j.nombre}</td>
<td className="p-3">{j.anio_nacimiento}</td>
<td className="p-3">{j.telefono}</td>

<td className="p-3">

<button
onClick={()=>editarJugador(j)}
className="bg-blue-600 text-white px-3 py-1 rounded"
>
Editar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)}

</div>

)

}