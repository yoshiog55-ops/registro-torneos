import { Link } from "react-router-dom"

export default function Navbar(){

return(

<nav className="bg-[#0A2540] text-white shadow">

<div className="max-w-6xl mx-auto flex justify-between items-center p-4">

<div className="flex items-center gap-3">

<img
src="/logo.png"
className="h-10"
/>

<h1 className="font-bold">
Aldebaran Torneos
</h1>

</div>

<div className="flex gap-6">

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