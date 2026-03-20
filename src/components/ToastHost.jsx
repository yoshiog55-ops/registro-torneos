import { useEffect, useState } from "react"

export default function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const onToast = (event) => {
      const detail = event?.detail || {}
      const id = `${Date.now()}-${Math.random()}`
      const toast = {
        id,
        message: detail.message || "Mensaje",
        type: detail.type || "info"
      }

      setItems(prev => [...prev, toast])

      setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== id))
      }, 2800)
    }

    window.addEventListener("app:toast", onToast)
    return () => window.removeEventListener("app:toast", onToast)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 w-[90%] max-w-sm">
      {items.map(item => (
        <div
          key={item.id}
          className={`rounded-lg shadow px-4 py-3 text-sm text-white ${
            item.type === "success"
              ? "bg-green-600"
              : item.type === "error"
                ? "bg-red-600"
                : item.type === "warning"
                  ? "bg-amber-600"
                  : "bg-gray-800"
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}

