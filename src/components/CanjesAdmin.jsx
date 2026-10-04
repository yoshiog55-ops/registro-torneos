import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { showToast } from "../utils/toast"
import { formatDateTimeInMexico } from "../utils/date"
import JugadorAutocomplete from "./JugadorAutocomplete"
import TicketsHistorial from "./TicketsHistorial"
import AsignarTickets from "./AsignarTickets"

export default function CanjesAdmin() {

  const [tab, setTab] = useState("canje")

  const [premios, setPremios] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [jugador, setJugador] = useState(null)

  const [movimientos, setMovimientos] = useState([])
  const [canjes, setCanjes] = useState([])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [premioEditando, setPremioEditando] = useState(null)
  const [formPremio, setFormPremio] = useState({
    nombre: "",
    descripcion: "",
    tickets: "",
    stock: "",
    imagen_url: ""
  })
  const [subiendoImagen, setSubiendoImagen] = useState(false)

  useEffect(() => {
    cargarPremios()
  }, [])

  async function cargarPremios() {

    const { data, error } = await supabase
      .from("premios")
      .select("*")
      .order("nombre")

    if (error) {
      showToast("No se pudieron cargar los premios: " + error.message, "error")
      return
    }

    setPremios(data || [])

  }

  async function seleccionarJugador(j) {
    setJugador(j)
    await cargarHistorial(j.id)
  }

  async function refrescarJugador(jugadorId) {

    const { data } = await supabase
      .from("jugadores")
      .select("id, player_id, nombre, tickets")
      .eq("id", jugadorId)
      .single()

    if (data) setJugador(data)

  }

  async function cargarHistorial(jugadorId) {

    const [{ data: movs }, { data: cjs }] = await Promise.all([
      supabase
        .from("tickets_movimientos")
        .select("*")
        .eq("jugador_id", jugadorId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("canjes")
        .select("*, premios(nombre)")
        .eq("jugador_id", jugadorId)
        .order("created_at", { ascending: false })
        .limit(20)
    ])

    setMovimientos(movs || [])
    setCanjes(cjs || [])

  }

  function cantidadPara(premioId) {
    return cantidades[premioId] || 1
  }

  function setCantidadPara(premioId, valor) {
    const cantidad = Math.max(1, Number(valor) || 1)
    setCantidades(prev => ({ ...prev, [premioId]: cantidad }))
  }

  async function canjear(premio) {

    if (!jugador) {
      showToast("Primero selecciona un jugador", "error")
      return
    }

    const cantidad = cantidadPara(premio.id)

    const { data, error } = await supabase.rpc("realizar_canje", {
      p_jugador_id: jugador.id,
      p_premio_id: premio.id,
      p_cantidad: cantidad
    })

    if (error) {
      showToast("No se pudo realizar el canje: " + error.message, "error")
      return
    }

    showToast(`Canje realizado: -${data.tickets_descontados} tickets`, "success")

    await Promise.all([
      cargarPremios(),
      refrescarJugador(jugador.id),
      cargarHistorial(jugador.id)
    ])

  }

  function abrirModalCrear() {
    setPremioEditando(null)
    setFormPremio({ nombre: "", descripcion: "", tickets: "", stock: "", imagen_url: "" })
    setModalAbierto(true)
  }

  function abrirModalEditar(p) {
    setPremioEditando(p)
    setFormPremio({
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      tickets: p.tickets ?? "",
      stock: p.stock ?? "",
      imagen_url: p.imagen_url || ""
    })
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setPremioEditando(null)
  }

  async function subirImagen(file) {

    if (!file) return

    setSubiendoImagen(true)

    const extension = file.name.split(".").pop()
    const nombreArchivo = `${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from("Pricewall")
      .upload(nombreArchivo, file)

    if (error) {
      showToast("No se pudo subir la imagen: " + error.message, "error")
      setSubiendoImagen(false)
      return
    }

    const { data } = supabase.storage
      .from("Pricewall")
      .getPublicUrl(nombreArchivo)

    setFormPremio(prev => ({ ...prev, imagen_url: data.publicUrl }))
    setSubiendoImagen(false)

  }

  async function guardarPremio() {

    if (!formPremio.nombre.trim()) {
      showToast("El nombre es obligatorio", "error")
      return
    }

    const payload = {
      nombre: formPremio.nombre.trim(),
      descripcion: formPremio.descripcion.trim() || null,
      tickets: Number(formPremio.tickets) || 0,
      stock: Number(formPremio.stock) || 0,
      imagen_url: formPremio.imagen_url.trim() || null
    }

    const { error } = premioEditando
      ? await supabase.from("premios").update(payload).eq("id", premioEditando.id)
      : await supabase.from("premios").insert({ ...payload, activo: true })

    if (error) {
      showToast("No se pudo guardar el premio: " + error.message, "error")
      return
    }

    showToast(premioEditando ? "Premio actualizado" : "Premio creado", "success")
    cerrarModal()
    cargarPremios()

  }

  async function toggleActivoPremio(p) {

    const { error } = await supabase
      .from("premios")
      .update({ activo: !p.activo })
      .eq("id", p.id)

    if (error) {
      showToast("No se pudo actualizar el premio: " + error.message, "error")
      return
    }

    cargarPremios()

  }

  async function eliminarPremio(p) {

    const confirmar = confirm(`Eliminar premio "${p.nombre}"?`)
    if (!confirmar) return

    const { error } = await supabase
      .from("premios")
      .delete()
      .eq("id", p.id)

    if (error) {
      showToast("No se pudo eliminar (puede tener canjes asociados): " + error.message, "error")
      return
    }

    cargarPremios()

  }

  const premiosParaCanje = premios.filter(p => p.activo)

  return (
    <div>

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Canjes, historial y asignaci?n de tickets</p>
        <h2 className="text-xl font-bold">
          Tickets
        </h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">

        <button
          onClick={() => setTab("canje")}
          className={`px-4 py-2 rounded ${tab === "canje" ? "bg-slate-900 text-white" : "bg-gray-200"}`}
        >
          Canjear
        </button>

        <button
          onClick={() => setTab("premios")}
          className={`px-4 py-2 rounded ${tab === "premios" ? "bg-slate-900 text-white" : "bg-gray-200"}`}
        >
          Administrar premios
        </button>

        <button
          onClick={() => setTab("historial")}
          className={`px-4 py-2 rounded ${tab === "historial" ? "bg-slate-900 text-white" : "bg-gray-200"}`}
        >
          Historial
        </button>

        <button
          onClick={() => setTab("asignar")}
          className={`px-4 py-2 rounded ${tab === "asignar" ? "bg-slate-900 text-white" : "bg-gray-200"}`}
        >
          Asignar tickets
        </button>

      </div>

      {tab === "canje" && (

        <div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

            <p className="mb-2 text-sm font-semibold">Buscar jugador</p>

            <JugadorAutocomplete onSelect={seleccionarJugador} placeholder="Player ID o nombre" />

            {jugador && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-900 p-3 text-white">
                <div>
                  <p className="font-semibold">{jugador.nombre}</p>
                  <p className="text-xs text-slate-300">{jugador.player_id}</p>
                </div>
                <p className="text-lg font-bold">{jugador.tickets} 🎫</p>
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">

            {premiosParaCanje.map(p => {
              const cantidad = cantidadPara(p.id)
              const total = p.tickets * cantidad
              const sinStock = p.stock <= 0
              const sinSaldo = !jugador || jugador.tickets < total

              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

                  {p.imagen_url && (
                    <img src={p.imagen_url} alt={p.nombre} className="mb-3 h-32 w-full rounded object-contain" />
                  )}

                  <p className="font-semibold">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-gray-500">{p.descripcion}</p>}
                  <p className="mt-1 text-sm">Costo: <span className="font-bold">{p.tickets} 🎫</span></p>
                  <p className="text-sm text-gray-500">Stock: {p.stock}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidadPara(p.id, e.target.value)}
                      className="w-16 rounded border p-1 text-center"
                    />
                    <button
                      onClick={() => canjear(p)}
                      disabled={sinStock || sinSaldo}
                      className={`flex-1 rounded px-3 py-2 text-white ${
                        sinStock || sinSaldo ? "bg-gray-300" : "bg-green-600"
                      }`}
                    >
                      {sinStock ? "Sin stock" : "Canjear"}
                    </button>
                  </div>

                </div>
              )
            })}

          </div>

          {jugador && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 font-semibold">Movimientos de tickets</p>
                <div className="max-h-64 overflow-y-auto text-sm divide-y">
                  {movimientos.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2">
                      <div>
                        <p>{m.motivo}{m.descripcion ? ` · ${m.descripcion}` : ""}</p>
                        <p className="text-xs text-gray-400">{formatDateTimeInMexico(m.created_at)}</p>
                      </div>
                      <p className={`font-bold ${m.cantidad >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}
                      </p>
                    </div>
                  ))}
                  {movimientos.length === 0 && <p className="py-2 text-gray-400">Sin movimientos</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 font-semibold">Canjes realizados</p>
                <div className="max-h-64 overflow-y-auto text-sm divide-y">
                  {canjes.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2">
                      <div>
                        <p>{c.premios?.nombre} x{c.cantidad}</p>
                        <p className="text-xs text-gray-400">{formatDateTimeInMexico(c.created_at)}</p>
                      </div>
                      <p className="font-bold text-red-600">-{c.tickets_descontados}</p>
                    </div>
                  ))}
                  {canjes.length === 0 && <p className="py-2 text-gray-400">Sin canjes</p>}
                </div>
              </div>

            </div>
          )}

        </div>

      )}

      {tab === "premios" && (

        <div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={abrirModalCrear}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Nuevo premio
            </button>
          </div>

          <div className="-mx-3 overflow-x-auto rounded-xl bg-white shadow sm:mx-0">

            <table className="min-w-[800px] w-full">

              <thead className="bg-gray-200">
                <tr>
                  <th className="p-3 text-left">Imagen</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-center">Tickets</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Editar</th>
                  <th className="p-3 text-center">Eliminar</th>
                </tr>
              </thead>

              <tbody>
                {premios.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">
                      {p.imagen_url && <img src={p.imagen_url} alt={p.nombre} className="h-12 w-12 rounded object-cover" />}
                    </td>
                    <td className="p-3 font-semibold">{p.nombre}</td>
                    <td className="p-3 text-center">{p.tickets}</td>
                    <td className="p-3 text-center">{p.stock}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleActivoPremio(p)}
                        className={`px-3 py-1 rounded text-white ${p.activo ? "bg-green-600" : "bg-gray-500"}`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => abrirModalEditar(p)}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => eliminarPremio(p)}
                        className="bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

        </div>

      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

            <h3 className="mb-4 text-lg font-bold">
              {premioEditando ? "Editar premio" : "Nuevo premio"}
            </h3>

            <div className="space-y-3">

              <div>
                <label className="mb-1 block text-sm font-semibold">Nombre</label>
                <input
                  className="w-full rounded border p-2"
                  value={formPremio.nombre}
                  onChange={(e) => setFormPremio(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Descripción</label>
                <textarea
                  className="w-full rounded border p-2"
                  rows={2}
                  value={formPremio.descripcion}
                  onChange={(e) => setFormPremio(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-semibold">Costo en tickets</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border p-2"
                    value={formPremio.tickets}
                    onChange={(e) => setFormPremio(prev => ({ ...prev, tickets: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-semibold">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border p-2"
                    value={formPremio.stock}
                    onChange={(e) => setFormPremio(prev => ({ ...prev, stock: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded border p-2"
                  onChange={(e) => subirImagen(e.target.files?.[0])}
                />
                {subiendoImagen && <p className="mt-1 text-xs text-gray-500">Subiendo imagen...</p>}
              </div>

              {formPremio.imagen_url && (
                <img src={formPremio.imagen_url} alt="Vista previa" className="h-28 w-full rounded object-contain" />
              )}

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cerrarModal}
                className="rounded bg-gray-300 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPremio}
                disabled={subiendoImagen}
                className={`rounded px-4 py-2 text-white ${subiendoImagen ? "bg-gray-300" : "bg-green-600"}`}
              >
                Guardar
              </button>
            </div>

          </div>
        </div>
      )}


      {tab === "historial" && <TicketsHistorial />}

      {tab === "asignar" && <AsignarTickets />}

    </div>
  )

}
