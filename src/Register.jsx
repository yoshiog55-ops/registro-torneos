import { useState } from "react"
import { supabase } from "./supabase"

export default function Register(){

const [form,setForm]=useState({
telefono:"",
player_id:"",
nombre:"",
anio:""
})

const registrar = async () => {

await supabase
.from("jugadores")
.insert([{
telefono:form.telefono,
player_id:form.player_id,
nombre:form.nombre,
anio_nacimiento:form.anio
}])

alert("Registrado")

}

return(

<div>

<h2>Registro Jugador</h2>

<input placeholder="Telefono"
onChange={e=>setForm({...form,telefono:e.target.value})}/>

<input placeholder="Player ID"
onChange={e=>setForm({...form,player_id:e.target.value})}/>

<input placeholder="Nombre"
onChange={e=>setForm({...form,nombre:e.target.value})}/>

<input placeholder="Año nacimiento"
onChange={e=>setForm({...form,anio:e.target.value})}/>

<button onClick={registrar}>
Registrar
</button>

</div>

)

}