import { Link } from "react-router-dom"

export default function Navbar(){

return(

<nav className="bg-[#0A2540] text-white shadow">

<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-4 sm:px-4 md:flex-row md:items-center md:justify-between">

<div className="flex items-center gap-3">

<img
src="/logo.png"
className="h-10"
/>

<h1 className="font-bold text-lg md:text-xl">
Torneos
</h1>

</div>

<div className="flex flex-wrap gap-3 text-sm md:gap-6 md:text-base">

<Link to="/" className="hover:text-[#00B7C3]">
Torneo
</Link>

<Link to="/registro" className="hover:text-[#00B7C3]">
Registrar jugador
</Link>

<Link to="/admin" className="hover:text-[#00B7C3]">
Admin
</Link>

{/* 🔥 NUEVO - JUGADORES */}
<Link to="/pareos" className="hover:text-[#00B7C3]">
Pareos
</Link>

</div>

</div>

</nav>

)

}
