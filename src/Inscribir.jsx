import { useState } from "react"
import { supabase } from "./supabase"

function Inscribir(){

  const [telefono,setTelefono] = useState("")
  const [jugador,setJugador] = useState(null)

  async function buscar(){

    const { data } = await supabase
      .from("jugadores")
      .select("*")
      .eq("telefono",telefono)
      .single()

    setJugador(data)
  }

  async function inscribir(){

    const { error } = await supabase
      .from("inscripciones")
      .insert([
        {
          jugador_id: jugador.id,
          fecha: new Date(),
          pagado: false
        }
      ])

    if(error){
      alert("Error")
    } else {
      alert("Jugador inscrito")
    }

  }

  return(

    <div className="container">

      <h2>Inscribirse</h2>

      <input
      placeholder="Teléfono"
      value={telefono}
      onChange={(e)=>setTelefono(e.target.value)}
      />

      <button onClick={buscar}>
      Buscar jugador
      </button>

      {jugador && (

        <div className="card">

          <h3>{jugador.nombre}</h3>
          <p>Player ID: {jugador.player_id}</p>

          <button onClick={inscribir}>
          Confirmar inscripción
          </button>

        </div>

      )}

    </div>

  )
}

export default Inscribir