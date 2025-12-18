"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Clock, User } from "lucide-react"

interface ProviderClientItem {
  clientId: string
  fullName: string | null
  email: string | null
  phone: string | null
  lastPaidAt: string | null
}

export function ProviderClients() {
  const [items, setItems] = useState<ProviderClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [selected, setSelected] = useState<ProviderClientItem | null>(null)

  useEffect(() => {
    async function loadClients() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, client_id, provider_id, status, paid_at")
        .eq("provider_id", user.id)
        .eq("status", "paid")

      if (ordersError || !orders) {
        console.error("Error fetching provider clients orders", ordersError)
        setItems([])
        setLoading(false)
        return
      }

      if (orders.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const clientIds = Array.from(new Set(orders.map((o) => o.client_id)))

      const { data: clients } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", clientIds)

      const mapped: ProviderClientItem[] = clientIds.map((clientId) => {
        const client = clients?.find((c: any) => c.id === clientId)
        const clientOrders = orders.filter((o: any) => o.client_id === clientId)
        const lastPaidAt = clientOrders
          .map((o: any) => o.paid_at as string | null)
          .filter((d): d is string => d != null)
          .sort((a, b) => (a > b ? -1 : 1))[0] || null

        return {
          clientId,
          fullName: (client?.full_name as string) || null,
          email: (client?.email as string) || null,
          phone: (client?.phone as string) || null,
          lastPaidAt,
        }
      })

      setItems(mapped)
      setLoading(false)
    }

    loadClients()
  }, [])

  const normalize = (value: string | null | undefined) => (value || "").toLowerCase().trim()

  const filteredItems: ProviderClientItem[] = items.filter((item: ProviderClientItem) => {
    const term = searchTerm.toLowerCase().trim()

    if (term) {
      const inName = normalize(item.fullName).includes(term)
      const inEmail = normalize(item.email).includes(term)
      if (!inName && !inEmail) return false
    }

    if (filterDate && item.lastPaidAt) {
      const lastDate = new Date(item.lastPaidAt).toISOString().slice(0, 10)
      if (lastDate !== filterDate) return false
    }

    return true
  })

  const debtStatusLabel = (lastPaidAt: string | null) => {
    if (!lastPaidAt) return "Sin pagos registrados (posible deuda, modo prueba)"
    const last = new Date(lastPaidAt)
    const now = new Date()
    if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
      return "Al día (modo prueba)"
    }
    return "Posible deuda: sin pago este mes (modo prueba)"
  }

  if (loading) {
    return <p>Cargando clientes afiliados...</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Clientes Afiliados</h2>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Buscar por cliente</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Ej: nombre o email del cliente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Filtrar por fecha de último pago</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {!loading && filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aún no tienes clientes afiliados a planes.</p>
        </Card>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.clientId} className="p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.fullName || "Cliente sin nombre"}</h3>
                  {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                  {item.phone && <p className="text-xs text-muted-foreground">Tel: {item.phone}</p>}
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                {item.lastPaidAt && (
                  <p>
                    <span className="font-medium">Último pago: </span>
                    {new Date(item.lastPaidAt).toLocaleDateString("es-AR")}
                  </p>
                )}
                <p>
                  <span className="font-medium">Estado: </span>
                  {debtStatusLabel(item.lastPaidAt)}
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  className="text-sm px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                  onClick={() => setSelected(item)}
                >
                  Ver detalle
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {selected.fullName || "Cliente sin nombre"}
                </h3>
                {selected.email && <p className="text-sm text-muted-foreground">{selected.email}</p>}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              {selected.phone && (
                <p>
                  <span className="font-medium">Teléfono: </span>
                  {selected.phone}
                </p>
              )}
              {selected.lastPaidAt && (
                <p>
                  <span className="font-medium">Último pago: </span>
                  {new Date(selected.lastPaidAt).toLocaleDateString("es-AR")}
                </p>
              )}
              <p>
                <span className="font-medium">Estado: </span>
                {debtStatusLabel(selected.lastPaidAt)}
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                onClick={() => setSelected(null)}
              >
                Cerrar
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
