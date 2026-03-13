import { useEffect,useState } from "react"
import { supabase } from "./supabase"

export default function Admin(){

const [inscritos,setInscritos]=useState([])

useEffect(()=>{

cargar()

},[])

const cargar = async () => {

const {data} = await supabase
.from("inscripciones")
.select(`
id,
pagado,
jugadores(nombre)
`)

setInscritos(data)

}

const marcarPagado = async(id)=>{

await supabase
.from("inscripciones")
.update({pagado:true})
.eq("id",id)

cargar()

}

return(

<div>

<h2>Inscritos</h2>

{inscritos.map(i=>

<div key={i.id}>

{i.jugadores.nombre}

{i.pagado ? " ✔" : " ❌"}

<button onClick={()=>marcarPagado(i.id)}>
Pagado
</button>

</div>

)}

</div>

)

}