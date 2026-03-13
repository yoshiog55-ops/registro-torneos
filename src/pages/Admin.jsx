import { useState, useEffect } from "react"
import { supabase } from "../supabase"

export default function Admin(){

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [auth,setAuth] = useState(false)
const [mensaje,setMensaje] = useState("")
const [jugadores,setJugadores] = useState([])

useEffect(()=>{

verificarSesion()

},[])

async function verificarSesion(){

const {data} = await supabase.auth.getSession()

if(data.session){
setAuth(true)
cargarJugadores()
}

}

async function login(){

const {error} = await supabase.auth.signInWithPassword({

email,
password

})

if(error){

setMensaje("Credenciales incorrectas")

}else{

setAuth(true)
setMensaje("Bienvenido administrador")
cargarJugadores()

}

}

async function logout(){

await supabase.auth.signOut()

setAuth(false)
setJugadores([])

}

async function cargarJugadores(){

const today = new Date().toISOString().split("T")[0]

const {data} = await supabase
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

cargarJugadores()

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

{mensaje && (
<div className="mt-4 bg-red-100 text-red-700 p-3 rounded text-center">
{mensaje}
</div>
)}

</div>

)

}

return(

<div className="max-w-6xl mx-auto">

<div className="flex justify-between items-center mb-6">

<h1 className="text-3xl font-bold">
Panel administrador
</h1>

<button
onClick={logout}
className="bg-red-500 text-white px-4 py-2 rounded"
>
Cerrar sesión
</button>

</div>

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

<td className="p-3">{j.jugadores.player_id}</td>
<td className="p-3">{j.jugadores.nombre}</td>
<td className="p-3">{j.jugadores.anio_nacimiento}</td>

<td className="p-3 text-center">

<button
onClick={()=>togglePago(j)}
className={`w-full py-3 rounded-xl font-bold text-white text-lg ${
  j.pagado ? "bg-green-600" : "bg-red-600"
}`}
>
{j.pagado ? "✔ Pagado" : "✖ No pagó"}
</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>navigator.clipboard.writeText(j.jugadores.player_id)}
className="bg-[#00B7C3] text-white px-3 py-1 rounded"
>
Copiar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}