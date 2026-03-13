import { useState } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"

function Registro() {

  const navigate = useNavigate()

  const [telefono,setTelefono] = useState("")
  const [playerId,setPlayerId] = useState("")
  const [nombre,setNombre] = useState("")
  const [anio,setAnio] = useState("")

  async function registrar(e){
    e.preventDefault()

    const { error } = await supabase
      .from("jugadores")
      .insert([
        {
          telefono: telefono,
          player_id: playerId,
          nombre: nombre,
          anio_nacimiento: anio
        }
      ])

    if(error){
      alert("Error registrando")
      console.log(error)
    } else {

      alert("Jugador registrado")

      navigate(`/inscribir?telefono=${telefono}`)
    }
  }

  return (
    <div className="container">

      <h2>Registro de jugador</h2>

      <form onSubmit={registrar}>

        <input placeholder="Teléfono"
        value={telefono}
        onChange={(e)=>setTelefono(e.target.value)}
        />

        <input placeholder="Player ID"
        value={playerId}
        onChange={(e)=>setPlayerId(e.target.value)}
        />

        <input placeholder="Nombre completo"
        value={nombre}
        onChange={(e)=>setNombre(e.target.value)}
        />

        <input placeholder="Año nacimiento"
        value={anio}
        onChange={(e)=>setAnio(e.target.value)}
        />

        <button type="submit">
          Registrar
        </button>

      </form>

    </div>
  )
}

export default Registro