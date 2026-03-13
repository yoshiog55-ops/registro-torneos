import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Registro from "./Register"
import Inscribir from "./Inscribir"
import Admin from "./Admin"

function Home() {
  return (
    <div className="container">
      <h1>Registro Torneo Pokémon</h1>

      <div className="menu">
        <Link to="/registro">
          <button>Registrar jugador</button>
        </Link>

        <Link to="/inscribir">
          <button>Inscribirse al torneo</button>
        </Link>

        <Link to="/admin">
          <button>Administrador</button>
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/inscribir" element={<Inscribir />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App