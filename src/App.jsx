import { BrowserRouter, Routes, Route } from "react-router-dom"

import Navbar from "./components/Navbar"
import ToastHost from "./components/ToastHost"

import Home from "./pages/Home"
import Registro from "./pages/Registro"
import Admin from "./pages/Admin"
import Pareos from "./pages/Pareos"

function App(){

return(

<BrowserRouter>

<Navbar/>
<ToastHost/>

<div className="min-h-screen bg-gray-100 px-3 py-4 sm:px-4 md:px-6 lg:px-8">

<Routes>

<Route path="/" element={<Home />} />

<Route path="/registro" element={<Registro />} />

<Route path="/admin" element={<Admin />} />

<Route path="/pareos" element={<Pareos />} />

</Routes>

</div>

</BrowserRouter>

)

}

export default App
