import { useState,useEffect,useRef } from "react"
import { supabase } from "../supabase"
import { getMexicoDateInputValue } from "../utils/date"
import { obtenerEventoActual, asegurarEventoDelDia } from "../utils/evento"

function obtenerDiaSemana(fecha) {
  try {
    const opciones = { weekday: "long" }
    return new Intl.DateTimeFormat("es-MX", opciones).format(new Date(fecha))
  } catch {
    return "Desconocido"
  }
}

function agruparEventosPorDia(eventos) {
  const grupos = eventos.reduce((acc, evento) => {
    const dia = obtenerDiaSemana(evento.fecha)
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(evento)
    return acc
  }, {})

  return Object.entries(grupos)
    .map(([dia, listado]) => ({
      dia,
      eventos: listado.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    }))
    .sort((a, b) => new Date(a.eventos[0].fecha) - new Date(b.eventos[0].fecha))
}

export default function ConsultaJugadores({ volver, torneos = [], torneoSeleccionado, eventoSeleccionado, onTorneoSeleccionadoChange }){
    
const [jugadores,setJugadores]=useState([])
const [busqueda,setBusqueda]=useState("")
const [mensaje,setMensaje]=useState("")
const [torneoSeleccionadoLocal,setTorneoSeleccionadoLocal]=useState(torneoSeleccionado)

const [editando,setEditando]=useState(null)

const [nombre,setNombre]=useState("")
const [anio,setAnio]=useState("")
const [telefono,setTelefono]=useState("")
const [playerId,setPlayerId]=useState("")

// Estados para filtro de torneos por rango de fechas
const [fechaInicio,setFechaInicio]=useState("")
const [fechaFin,setFechaFin]=useState("")
const [torneosJugadosPorJugador,setTorneosJugadosPorJugador]=useState({})
const [eventosDisponibles,setEventosDisponibles]=useState([])
const [eventoFiltrado,setEventoFiltrado]=useState("ALL")
const [ordenarPor,setOrdenarPor]=useState({campo: "nombre", direccion: "asc"})
const [tooltipAbiertoPara,setTooltipAbiertoPara]=useState(null)
const tooltipRef = useRef(null)

// Inicializar con mes anterior
useEffect(()=>{
  const hoy = new Date()
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const primerDiaMesAnterior = mesAnterior.toISOString().split('T')[0]
  const hoyString = hoy.toISOString().split('T')[0]
  
  setFechaInicio(primerDiaMesAnterior)
  setFechaFin(hoyString)
}, [])

useEffect(()=>{
cargarJugadores()
},[])

useEffect(()=>{
setTorneoSeleccionadoLocal(torneoSeleccionado)
},[torneoSeleccionado])

// Cargar torneos jugados y eventos cuando cambian las fechas
useEffect(()=>{
if(fechaInicio && fechaFin){
  cargarEventosEnRango()
  cargarTorneosJugados()
}
},[fechaInicio,fechaFin,eventoFiltrado])

useEffect(() => {
  const handleClickFuera = (event) => {
    if (!tooltipRef.current) return
    if (tooltipRef.current.contains(event.target)) return
    setTooltipAbiertoPara(null)
  }

  document.addEventListener("mousedown", handleClickFuera)
  return () => document.removeEventListener("mousedown", handleClickFuera)
}, [])

async function aplicarFiltros(){
  if(fechaInicio && fechaFin){
    await cargarEventosEnRango()
    await cargarTorneosJugados()
  }
}

async function cargarJugadores(){

const {data}=await supabase
.from("jugadores")
.select("*")
.order("nombre")

setJugadores(data)

}

async function cargarTorneosJugados(){
  try {
    // Obtener todos los eventos en ese rango
    const {data: eventos} = await supabase
      .from("eventos")
      .select("id, torneo_id, fecha")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)

    if(!eventos || eventos.length === 0){
      setTorneosJugadosPorJugador({})
      return
    }

    // Filtrar por evento si está especificado
    let eventoIds = eventos.map(e => e.id)
    let eventosAUsar = eventos
    
    if(eventoFiltrado !== "ALL"){
      const evento = eventos.find(e => String(e.id) === String(eventoFiltrado))
      if(evento){
        eventoIds = [evento.id]
        eventosAUsar = [evento]
      } else {
        setTorneosJugadosPorJugador({})
        return
      }
    }
    
    // Obtener torneos para nombres
    const {data: torneosData} = await supabase
      .from("torneos")
      .select("id, nombre")
    
    const mapaTorneosNombre = {}
    if(torneosData){
      torneosData.forEach(t => {
        mapaTorneosNombre[t.id] = t.nombre
      })
    }
    
    // Obtener matches donde el jugador participó en esos eventos
    const {data: matches} = await supabase
      .from("matches")
      .select("jugador1_id, jugador2_id, evento_id")
      .in("evento_id", eventoIds)

    if(!matches || matches.length === 0){
      setTorneosJugadosPorJugador({})
      return
    }

    // Obtener standings para posiciones
    const {data: standings} = await supabase
      .from("standings")
      .select("player_id, evento_id, posicion")
      .in("evento_id", eventoIds)
    
    const mapaStandings = {}
    if(standings){
      standings.forEach(s => {
        mapaStandings[`${s.player_id}_${s.evento_id}`] = s.posicion
      })
    }
    
    // Mapear player_id -> array de eventos con detalles
    const mapaDetallesEventos = {}
    matches.forEach(m => {
      const evento = eventosAUsar.find(e => e.id === m.evento_id)
      
      if(evento){
        // Procesar jugador 1
        if(m.jugador1_id){
          if(!mapaDetallesEventos[m.jugador1_id]){
            mapaDetallesEventos[m.jugador1_id] = []
          }
          mapaDetallesEventos[m.jugador1_id].push({
            eventoId: m.evento_id,
            fecha: evento.fecha,
            torneoNombre: mapaTorneosNombre[evento.torneo_id] || `Torneo ${evento.torneo_id}`,
            posicion: mapaStandings[`${m.jugador1_id}_${m.evento_id}`] || null
          })
        }
        
        // Procesar jugador 2
        if(m.jugador2_id){
          if(!mapaDetallesEventos[m.jugador2_id]){
            mapaDetallesEventos[m.jugador2_id] = []
          }
          mapaDetallesEventos[m.jugador2_id].push({
            eventoId: m.evento_id,
            fecha: evento.fecha,
            torneoNombre: mapaTorneosNombre[evento.torneo_id] || `Torneo ${evento.torneo_id}`,
            posicion: mapaStandings[`${m.jugador2_id}_${m.evento_id}`] || null
          })
        }
      }
    })

    // Eliminar duplicados y contar eventos únicos
    const resultado = {}
    Object.keys(mapaDetallesEventos).forEach(playerId => {
      const detalles = mapaDetallesEventos[playerId]
      const eventosUnicos = []
      const eventoIdsVisto = new Set()
      
      detalles.forEach(d => {
        if(!eventoIdsVisto.has(d.eventoId)){
          eventoIdsVisto.add(d.eventoId)
          eventosUnicos.push(d)
        }
      })
      
      resultado[playerId] = {
        count: eventosUnicos.length,
        eventos: eventosUnicos
      }
    })

    setTorneosJugadosPorJugador(resultado)
  } catch(error){
    console.error("Error cargando torneos jugados:", error)
    setTorneosJugadosPorJugador({})
  }
}

async function cargarEventosEnRango(){
  try {
    const {data: eventos} = await supabase
      .from("eventos")
      .select("id, nombre, fecha")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", {ascending: false})

    setEventosDisponibles(eventos || [])
    setEventoFiltrado("ALL")
  } catch(error){
    console.error("Error cargando eventos:", error)
    setEventosDisponibles([])
  }
}

async function inscribirJugador(j){

  if(!torneoSeleccionadoLocal || torneoSeleccionadoLocal === "ALL"){
  setMensaje("Selecciona un torneo especifico para inscribir")
  return
  }

  const today = getMexicoDateInputValue()
  const torneoIdFinal = torneoSeleccionadoLocal

const {data:estado}=await supabase
.from("torneo_estado")
.select("*")
.single()

const late = !estado.registro_abierto

let eventoIdFinal = eventoSeleccionado || null

if(!eventoIdFinal){
  // Asegurar que existe evento para hoy
  await asegurarEventoDelDia(torneoIdFinal)
  const evento = await obtenerEventoActual(torneoIdFinal)
  eventoIdFinal = evento?.id || null
}

if(!eventoIdFinal){
  setMensaje("No hay evento activo disponible para este torneo")
  return
}

let existeQuery = supabase
.from("inscripciones")
.select("id")
.eq("jugador_id",j.id)
.eq("fecha",today)
.eq("torneo_id", torneoIdFinal)
.eq("evento_id", eventoIdFinal)

const {data:existe}=await existeQuery

if(existe.length>0){

setMensaje("Jugador ya inscrito hoy")
return

}

await supabase
.from("inscripciones")
.insert({

jugador_id:j.id,
torneo_id: torneoIdFinal,
fecha: today,
late:late,
evento_id: eventoIdFinal

})

setMensaje("Jugador inscrito correctamente")

}

function abrirEditar(j){

setEditando(j)
setNombre(j.nombre)
setPlayerId(j.player_id)
setAnio(j.anio_nacimiento)
setTelefono(j.telefono)

}

function normalizarBusqueda(texto){
return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function toggleOrdenamiento(campo){
  if(ordenarPor.campo === campo){
    // Si es el mismo campo, cambiar dirección
    setOrdenarPor({
      campo,
      direccion: ordenarPor.direccion === "asc" ? "desc" : "asc"
    })
  } else {
    // Si es diferente campo, ordenar ascendente
    setOrdenarPor({
      campo,
      direccion: "asc"
    })
  }
}

function obtenerJugadoresOrdenados(listado){
  const copia = [...listado]
  
  copia.sort((a, b) => {
    let valorA, valorB
    
    switch(ordenarPor.campo){
      case "player_id":
        valorA = String(a.player_id || "").toLowerCase()
        valorB = String(b.player_id || "").toLowerCase()
        break
      case "nombre":
        valorA = String(a.nombre || "").toLowerCase()
        valorB = String(b.nombre || "").toLowerCase()
        break
      case "anio":
        valorA = Number(a.anio_nacimiento || 0)
        valorB = Number(b.anio_nacimiento || 0)
        break
      case "telefono":
        valorA = String(a.telefono || "").toLowerCase()
        valorB = String(b.telefono || "").toLowerCase()
        break
      case "torneos":
        valorA = torneosJugadosPorJugador[a.player_id]?.count || 0
        valorB = torneosJugadosPorJugador[b.player_id]?.count || 0
        break
      default:
        return 0
    }
    
    if(valorA < valorB) return ordenarPor.direccion === "asc" ? -1 : 1
    if(valorA > valorB) return ordenarPor.direccion === "asc" ? 1 : -1
    return 0
  })
  
  return copia
}

function iconoOrdenamiento(campo){
  if(ordenarPor.campo !== campo) return ""
  return ordenarPor.direccion === "asc" ? " ↑" : " ↓"
}

async function guardarCambios(){

if(!editando?.id){
  setMensaje("No hay jugador seleccionado para editar")
  return
}

if(!/^[0-9]+$/.test(playerId)){
  setMensaje("Player ID solo debe contener numeros")
  return
}

const playerIdAnterior = String(editando.player_id || "")
const playerIdNuevo = String(playerId || "")

const { error } = await supabase
.from("jugadores")
.update({
nombre,
player_id: playerIdNuevo,
anio_nacimiento:anio,
telefono
})
.eq("id",editando.id)

if(error){
  if(error.code === "23505"){
    setMensaje("Ese Player ID ya existe en otro jugador")
    return
  }

  setMensaje("No se pudo actualizar el jugador: " + error.message)
  return
}

if(playerIdAnterior && playerIdAnterior !== playerIdNuevo){
  const actualizaciones = await Promise.all([
    supabase
      .from("standings")
      .update({ player_id: playerIdNuevo })
      .eq("player_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ jugador1_id: playerIdNuevo })
      .eq("jugador1_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ jugador2_id: playerIdNuevo })
      .eq("jugador2_id", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_reportado_1: playerIdNuevo })
      .eq("ganador_reportado_1", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_reportado_2: playerIdNuevo })
      .eq("ganador_reportado_2", playerIdAnterior),
    supabase
      .from("matches")
      .update({ ganador_final: playerIdNuevo })
      .eq("ganador_final", playerIdAnterior)
  ])

  const errorRelacionada = actualizaciones.find(item => item.error)?.error

  if(errorRelacionada){
    setMensaje("Jugador actualizado, pero no se pudo propagar el nuevo Player ID a todas las tablas: " + errorRelacionada.message)
    await cargarJugadores()
    return
  }

  const playerIdGuardado = localStorage.getItem("player_id")
  if(String(playerIdGuardado) === playerIdAnterior){
    localStorage.setItem("player_id", playerIdNuevo)
  }
}

setMensaje("Jugador actualizado correctamente")

setEditando(null)

await cargarJugadores()

}

return(

<div>
<div className="flex justify-between items-center mb-4">

<button
onClick={volver}
className="bg-gray-600 text-white px-4 py-2 rounded"
>
Volver
</button>

<h2 className="text-xl font-bold">
Consulta de jugadores
</h2>

</div>

{torneos.length > 1 && (
<div className="mb-4">
<p className="mb-2 text-sm font-bold">Torneo para inscribir</p>
<div className="grid gap-2 sm:grid-cols-2">
{torneos.map(t => {
  const seleccionado = String(torneoSeleccionadoLocal) === String(t.id)
  return (
    <button
    key={t.id}
    type="button"
    onClick={()=>{
      const siguiente = String(t.id)
      setTorneoSeleccionadoLocal(siguiente)
      onTorneoSeleccionadoChange?.(siguiente)
    }}
    className={`rounded-lg border p-3 text-center font-semibold transition ${
      seleccionado
        ? "border-blue-700 bg-blue-600 text-white"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
    }`}
    >
    {t.nombre}
    </button>
  )
})}
</div>
</div>
)}

<div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
<p className="mb-3 text-sm font-bold">Filtrar torneos jugados por rango de fechas</p>
<div className="grid gap-3 sm:grid-cols-3">
<div>
<label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Inicio</label>
<input
type="date"
value={fechaInicio}
onChange={(e) => setFechaInicio(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>
<div>
<label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Fin</label>
<input
type="date"
value={fechaFin}
onChange={(e) => setFechaFin(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>
<div>
<label className="block text-xs font-semibold text-gray-700 mb-1">Evento</label>
<select
value={eventoFiltrado}
onChange={(e) => setEventoFiltrado(e.target.value)}
className="border p-2 rounded w-full"
disabled={eventosDisponibles.length === 0}
>
<option value="ALL">Todos los eventos</option>
{eventosDisponibles.map(ev => (
<option key={ev.id} value={ev.id}>
{ev.nombre || `Evento ${ev.id}`} ({ev.fecha})
</option>
))}
</select>
</div>
</div>
<button
onClick={aplicarFiltros}
className="mt-3 bg-blue-600 text-white px-4 py-2 rounded w-full font-semibold hover:bg-blue-700"
>
Buscar
</button>
</div>
 
<input
placeholder="Buscar jugador (nombre, player ID o telefono)"
className="border p-3 mb-4 rounded w-full"
onChange={(e)=>setBusqueda(e.target.value)}
/>

{mensaje && (
<div className="mb-4 bg-green-100 text-green-700 p-3 rounded text-center">
{mensaje}
</div>
)}

<div className="w-full overflow-x-auto">

<table className="min-w-[720px] w-full bg-white shadow rounded-xl text-sm md:text-base">

<thead className="bg-gray-200">

<tr>
<th 
className="p-3 text-center cursor-pointer hover:bg-gray-300 select-none"
onClick={() => toggleOrdenamiento("player_id")}
>
Player ID{iconoOrdenamiento("player_id")}
</th>
<th 
className="p-3 text-center cursor-pointer hover:bg-gray-300 select-none"
onClick={() => toggleOrdenamiento("nombre")}
>
Nombre{iconoOrdenamiento("nombre")}
</th>
<th 
className="p-3 text-center cursor-pointer hover:bg-gray-300 select-none"
onClick={() => toggleOrdenamiento("anio")}
>
Año{iconoOrdenamiento("anio")}
</th>
<th 
className="p-3 text-center cursor-pointer hover:bg-gray-300 select-none"
onClick={() => toggleOrdenamiento("telefono")}
>
Teléfono{iconoOrdenamiento("telefono")}
</th>
{fechaInicio && fechaFin && (
<th 
className="p-3 text-center cursor-pointer hover:bg-gray-300 select-none"
onClick={() => toggleOrdenamiento("torneos")}
>
Torneos Jugados{iconoOrdenamiento("torneos")}
</th>
)}
<th className="p-3 text-center">Inscribir</th>
<th className="p-3 text-center">Editar</th>
</tr>

</thead>

<tbody>

{obtenerJugadoresOrdenados(jugadores)
.filter(j =>
(j.nombre && normalizarBusqueda(j.nombre).includes(normalizarBusqueda(busqueda))) ||
(j.player_id && normalizarBusqueda(j.player_id).includes(normalizarBusqueda(busqueda))) ||
(j.telefono && normalizarBusqueda(j.telefono).includes(normalizarBusqueda(busqueda)))
)
.map(j=>(

<tr key={j.id} className="border-t odd:bg-gray-50">

<td className="p-3 text-center">{j.player_id}</td>

<td className="p-3 whitespace-nowrap">
{j.nombre}
</td>

<td className="p-3 text-center">{j.anio_nacimiento}</td>

<td className="p-3 text-center">{j.telefono}</td>

{fechaInicio && fechaFin && (
<td className="p-3 text-center">
<div className="relative inline-block" ref={tooltipRef}>
<button
  type="button"
  onClick={() => setTooltipAbiertoPara(prev => prev === j.player_id ? null : j.player_id)}
  className="inline-flex items-center justify-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold hover:bg-purple-200"
>
  {torneosJugadosPorJugador[j.player_id]?.count || 0}
</button>

{torneosJugadosPorJugador[j.player_id]?.eventos && torneosJugadosPorJugador[j.player_id].eventos.length > 0 && tooltipAbiertoPara === j.player_id && (() => {
  const grupos = agruparEventosPorDia(torneosJugadosPorJugador[j.player_id].eventos)
  return (
    <div className="fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[75rem] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-gray-900 p-4 text-sm text-white shadow-2xl scrollbar-visible pointer-events-auto">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 bg-gray-900 px-4 pt-4 pb-3 text-center text-xs uppercase tracking-[0.12em] text-white/80">
        Eventos por día
      </div>
      <div className="flex min-w-max gap-4 pb-2">
        {grupos.map(grupo => (
          <div key={grupo.dia} className="min-w-[12rem] rounded-3xl border border-white/10 bg-white/5 p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">{grupo.dia}</div>
            <div className="space-y-3">
              {grupo.eventos.map((ev, idx) => (
                <div key={idx} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <div className="font-semibold text-sm text-white">{ev.torneoNombre}</div>
                  <div className="text-gray-300 text-[13px] mt-1">{ev.fecha}</div>
                  {ev.posicion ? (
                    <div className="text-yellow-300 mt-3 text-sm">
                      Posición: <span className="font-bold text-base">#{ev.posicion}</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 mt-3 text-sm">Sin ranking</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})()}
</div>
</td>
)}

<td className="p-3 text-center">

<button
onClick={()=>inscribirJugador(j)}
className="bg-green-600 text-white px-3 py-1 md:px-4 md:py-2 rounded text-xs md:text-sm"
>
Inscribir
</button>

</td>

<td className="p-3 text-center">

<button
onClick={()=>abrirEditar(j)}
className="bg-blue-600 text-white px-3 py-1 md:px-4 md:py-2 rounded text-xs md:text-sm"
>
Editar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

{/* POPUP EDITAR */}

{editando && (

<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">

<div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">

<h2 className="text-xl font-bold mb-4">
Editar jugador
</h2>

<input
className="border p-3 w-full mb-3 rounded"
value={playerId}
onChange={(e)=>setPlayerId(e.target.value.replace(/\D/g,''))}
placeholder="Player ID"
/>

<input
className="border p-3 w-full mb-3 rounded"
value={nombre}
onChange={(e)=>setNombre(e.target.value)}
placeholder="Nombre"
/>

<input
className="border p-3 w-full mb-3 rounded"
value={anio}
onChange={(e)=>setAnio(e.target.value.replace(/\D/g,''))}
placeholder="Anio nacimiento"
maxLength="4"
/>

<input
className="border p-3 w-full mb-4 rounded"
value={telefono}
onChange={(e)=>setTelefono(e.target.value.replace(/\D/g,''))}
placeholder="Telefono"
/>

<div className="flex gap-3">

<button
onClick={guardarCambios}
className="bg-green-600 text-white px-4 py-2 rounded w-full"
>
Guardar
</button>

<button
onClick={()=>setEditando(null)}
className="bg-gray-500 text-white px-4 py-2 rounded w-full"
>
Cancelar
</button>

</div>

</div>

</div>

)}

</div>

)

}
