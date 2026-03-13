import { BrowserRouter, Routes, Route } from "react-router-dom"
import Register from "./Register"
import Inscribir from "./Inscribir"
import Admin from "./Admin"

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/registro" element={<Register />} />
        <Route path="/inscribir" element={<Inscribir />} />
        <Route path="/admin" element={<Admin />} />

      </Routes>

    </BrowserRouter>

  )

}

export default App