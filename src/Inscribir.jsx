import { useState } from "react"
import { supabase } from "./supabase"

const TORNEO_ID="ID_DEL_TORNEO"

export default function Inscribir(){

const [telefono,setTelefono]=useState("")

const inscribir = async () => {

const {data} = await supabase
.from("jugadores")
.select("*")
.eq("telefono",telefono)
.single()

if(!data){

alert("Jugador no registrado")
return

}

await supabase
.from("inscripciones")
.insert([{
jugador_id:data.id,
torneo_id:TORNEO_ID
}])

alert("Inscrito")

}

return(

<div>

<h2>Inscripción torneo</h2>

<input
placeholder="Telefono"
onChange={e=>setTelefono(e.target.value)}
/>

<button onClick={inscribir}>
Inscribirme
</button>

</div>

)

}