import { BrowserRouter, Routes, Route } from "react-router-dom"

import Navbar from "./components/Navbar"

import Home from "./pages/Home"
import Registro from "./pages/Registro"
import Admin from "./pages/Admin"

function App(){

return(

<BrowserRouter>

<Navbar/>

<div className="p-8 bg-gray-100 min-h-screen">

<Routes>

<Route path="/" element={<Home />} />

<Route path="/registro" element={<Registro />} />

<Route path="/admin" element={<Admin />} />

</Routes>

</div>

</BrowserRouter>

)

}

export default App