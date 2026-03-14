import { Link } from "react-router-dom"

export default function Navbar(){

return(

<nav className="bg-[#0A2540] text-white shadow">

<div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between p-4">

<div className="flex items-center gap-3">

<img
src="/logo.png"
className="h-10"
/>

<h1 className="font-bold text-lg md:text-xl">
Torneos
</h1>

</div>

<div className="flex flex-wrap gap-4 md:gap-6 text-sm md:text-base mt-2 md:mt-0">

<Link to="/" className="hover:text-[#00B7C3]">
Torneo
</Link>

<Link to="/registro" className="hover:text-[#00B7C3]">
Registrar jugador
</Link>

<Link to="/admin" className="hover:text-[#00B7C3]">
Admin
</Link>

</div>

</div>

</nav>

)

}