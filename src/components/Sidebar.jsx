import { useEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { UserPlus, ClipboardList, Users, Trophy, History, Swords, Ticket, LogOut, Briefcase, Settings, ChevronUp, X } from "lucide-react"

const grupos = [
  {
    titulo: "Operación",
    corto: "Operación",
    icon: Briefcase,
    items: [
      { id: "torneo", titulo: "Inscripciones", corto: "Inscrip.", icon: ClipboardList },
      { id: "rondas", titulo: "Rondas y TDF", corto: "Rondas", icon: Swords },
      { id: "tickets", titulo: "Tickets", corto: "Tickets", icon: Ticket }
    ]
  },
  {
    titulo: "Administración",
    corto: "Admin",
    icon: Settings,
    items: [
      { id: "jugadores", titulo: "Base de jugadores", corto: "Jugadores", icon: Users },
      { id: "torneos", titulo: "Catálogo de torneos", corto: "Torneos", icon: Trophy },
      { id: "historial", titulo: "Historial de eventos", corto: "Eventos", icon: History }
    ]
  }
]

export default function Sidebar(){

const { pathname } = useLocation()
const navigate = useNavigate()
const [sesion,setSesion] = useState(false)
const [abierto,setAbierto] = useState(null)
const grupoAbierto = grupos.find(g => g.titulo === abierto)

useEffect(()=>{
  supabase.auth.getSession().then(({ data })=>setSesion(!!data.session))
  const { data: listener } = supabase.auth.onAuthStateChange((_e, s)=>setSesion(!!s))
  return ()=>listener.subscription.unsubscribe()
},[])

async function cerrarSesion(){
  setAbierto(null)
  await supabase.auth.signOut()
  navigate("/admin")
}

const enRegistro = pathname.startsWith("/registro")
const vistaActiva = pathname.startsWith("/admin")
  ? (pathname.split("/")[2] || "torneo")
  : null

const ruta = (id) => id === "torneo" ? "/admin" : `/admin/${id}`

const base = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
const on = "bg-[#00B7C3] text-white shadow"
const off = "text-slate-200 hover:bg-white/10"

const mBase = "flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium"

return(
<>

<aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#0A2540] p-3 text-white shadow-lg md:flex">

<div className="mb-4 flex items-center gap-3 px-2 py-2">
<img src="/logo.png" className="h-10" alt="" />
</div>

<nav className="flex flex-1 flex-col gap-1 overflow-y-auto">

<NavLink to="/registro" className={`${base} ${enRegistro ? on : off}`}>
<UserPlus size={18} />
Registrar jugador
</NavLink>

{grupos.map(g=>(
<div key={g.titulo} className="flex flex-col gap-1">

<p className="mt-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
{g.titulo}
</p>

{g.items.map(({ id, titulo, icon: Icon })=>(
<NavLink
key={id}
to={ruta(id)}
className={`${base} ${vistaActiva === id ? on : off}`}
>
<Icon size={18} />
{titulo}
</NavLink>
))}

</div>
))}
</nav>

{sesion && (
<button onClick={cerrarSesion} className={`${base} ${off} mt-2 text-red-300`}>
<LogOut size={18} />
Cerrar sesión
</button>
)}

</aside>

{abierto && (
<div className="fixed inset-0 z-30 md:hidden" onClick={()=>setAbierto(null)} />
)}

<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A2540] text-white shadow-[0_-2px_8px_rgba(0,0,0,0.2)] md:hidden">

{grupoAbierto && (
<div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0A2540] p-2 shadow-xl">
<div className="mb-1 flex items-center justify-between px-3 py-1">
<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
{grupoAbierto.titulo}
</p>
<button onClick={()=>setAbierto(null)} aria-label="Cerrar men?" className="text-slate-300">
<X size={18} />
</button>
</div>
{grupoAbierto.items.map(({ id, titulo, icon: Icon })=>(
<NavLink
key={id}
to={ruta(id)}
onClick={()=>setAbierto(null)}
className={`${base} ${vistaActiva === id ? on : off}`}
>
<Icon size={18} />
{titulo}
</NavLink>
))}
</div>
)}

<div className="flex">

<NavLink to="/registro" onClick={()=>setAbierto(null)} className={`${mBase} ${enRegistro ? on : off}`}>
<UserPlus size={20} />
Registrar
</NavLink>

{grupos.map(g=>{
const activo = g.items.some(i => i.id === vistaActiva)
const GIcon = g.icon
return(
<button
key={g.titulo}
onClick={()=>setAbierto(abierto === g.titulo ? null : g.titulo)}
className={`${mBase} ${activo ? on : abierto === g.titulo ? "bg-white/10" : off}`}
>
<GIcon size={20} />
<span className="flex items-center gap-0.5">
{g.corto}
<ChevronUp size={12} className={`transition-transform ${abierto === g.titulo ? "rotate-180" : ""}`} />
</span>
</button>
)
})}

{sesion && (
<button onClick={cerrarSesion} className={`${mBase} text-red-300`}>
<LogOut size={20} />
Salir
</button>
)}

</div>

</nav>

</>
)

}



