"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function MercadopagoTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayTest = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mercadopago/checkout/test", {
        method: "POST",
      })

      const json = (await res.json().catch(() => null)) as any

      if (!res.ok) {
        setError(json?.error || "No se pudo iniciar el pago de prueba.")
        setLoading(false)
        return
      }

      const initPoint = json?.init_point as string | undefined
      if (!initPoint) {
        setError("Respuesta inválida del servidor.")
        setLoading(false)
        return
      }

      window.location.href = initPoint
    } catch (e) {
      console.error("Error iniciando pago de prueba", e)
      setError("No se pudo iniciar el pago de prueba. Intenta nuevamente.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Pago de prueba Mercado Pago</h1>
      <p className="text-sm text-gray-600 text-center max-w-md">
        Este botón crea un pago de prueba de <strong>$100 ARS</strong> usando Checkout Pro con las credenciales de
        producción configuradas en el sistema.
      </p>
      <Button onClick={handlePayTest} disabled={loading}>
        {loading ? "Redirigiendo a Mercado Pago..." : "Pagar $100 ARS"}
      </Button>
      {error && <p className="text-sm text-red-600 max-w-md text-center">{error}</p>}
    </div>
  )
}
