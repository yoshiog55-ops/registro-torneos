import { useEffect,useState } from "react"
import { supabase } from "./supabase"

function Admin(){

  const [inscritos,setInscritos] = useState([])

  useEffect(()=>{
    cargar()
  },[])

  async function cargar(){

    const hoy = new Date()
    hoy.setHours(0,0,0,0)

    const { data } = await supabase
      .from("inscripciones")
      .select(`
        id,
        pagado,
        fecha,
        jugadores (
          nombre,
          player_id
        )
      `)
      .gte("fecha",hoy.toISOString())

    setInscritos(data)
  }

  async function marcarPago(id){

    await supabase
      .from("inscripciones")
      .update({pagado:true})
      .eq("id",id)

    cargar()
  }

  return(

    <div className="container">

      <h2>Inscritos hoy</h2>

      {inscritos.map(i=>(
        <div key={i.id} className="card">

          <strong>
          {i.jugadores.nombre}
          </strong>

          <p>
          Player ID: {i.jugadores.player_id}
          </p>

          <button onClick={()=>marcarPago(i.id)}>
            {i.pagado ? "Pagado" : "Marcar pago"}
          </button>

        </div>
      ))}

    </div>
  )
}

export default Admin