import { BrowserRouter, Routes, Route } from "react-router-dom"

import Sidebar from "./components/Sidebar"
import ToastHost from "./components/ToastHost"

import Home from "./pages/Home"
import Registro from "./pages/Registro"
import Admin from "./pages/Admin"
import Pareos from "./pages/Pareos"

function App(){

return(

<BrowserRouter>

<Sidebar/>
<ToastHost/>

<div className="min-h-screen bg-gray-100 md:ml-60 px-3 py-4 pb-24 sm:px-4 md:px-6 lg:px-8">

<Routes>

<Route path="/" element={<Home />} />

<Route path="/registro" element={<Registro />} />

<Route path="/admin/:vista?" element={<Admin />} />

<Route path="/pareos" element={<Pareos />} />

</Routes>

</div>

</BrowserRouter>

)

}

export default App


