"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Clock, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProviderClientItem {
  clientId: string
  fullName: string | null
  email: string | null
  phone: string | null
  lastPaidAt: string | null
}

interface ClientPlanForProvider {
  orderId: string
  serviceName: string | null
  amount: number
  paidAt: string | null
  status: string
}

export function ProviderClients() {
  const [items, setItems] = useState<ProviderClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [selected, setSelected] = useState<ProviderClientItem | null>(null)
  const [clientPlans, setClientPlans] = useState<ClientPlanForProvider[] | null>(null)
  const [loadingClientPlans, setLoadingClientPlans] = useState(false)
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const [planStatusFilter, setPlanStatusFilter] = useState<"all" | "active" | "cancelled">("all")
  const { toast } = useToast()

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

      // Determinar ID efectivo de proveedor (dueño o empleado)
      let effectiveProviderId: string = (user.user_metadata as any)?.parent_provider_id || user.id

      if (!effectiveProviderId || effectiveProviderId === user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, parent_provider_id")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.role === "provider_employee" && profile.parent_provider_id) {
          effectiveProviderId = profile.parent_provider_id as string
        }
      }

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, client_id, provider_id, status, paid_at")
        .eq("provider_id", effectiveProviderId)
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
    if (!lastPaidAt) return "Sin pagos registrados (posible deuda)"
    const last = new Date(lastPaidAt)
    const now = new Date()
    if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
      return "Al día"
    }
    return "Posible deuda: sin pago este mes"
  }

  const handleOpenContractPdf = (orderId: string) => {
    const url = `/api/contracts/pdf?order_id=${encodeURIComponent(orderId)}`
    const win = window.open(url, "_blank", "noopener,noreferrer")
    if (!win) {
      toast({
        title: "Ventana bloqueada",
        description: "Permite las ventanas emergentes para poder ver el contrato en PDF.",
      })
    }
  }

  const handleOpenLastReceiptPdf = async (orderId: string) => {
    setLoadingReceipt(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("payment_receipts")
        .select("id, issued_at")
        .eq("order_id", orderId)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error fetching last receipt for provider client", error)
        toast({
          title: "No se pudo cargar el comprobante",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      if (!data) {
        toast({
          title: "Sin comprobantes",
          description: "Todavía no hay comprobantes de pago para este cliente.",
        })
        return
      }

      const url = `/api/receipts/pdf?receipt_id=${encodeURIComponent(data.id as string)}`
      const win = window.open(url, "_blank", "noopener,noreferrer")
      if (!win) {
        toast({
          title: "Ventana bloqueada",
          description: "Permite las ventanas emergentes para poder ver el comprobante en PDF.",
        })
      }
    } finally {
      setLoadingReceipt(false)
    }
  }

  const handleOpenClientDetail = async (item: ProviderClientItem) => {
    setSelected(item)
    setClientPlans(null)
    setLoadingClientPlans(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setClientPlans([])
        return
      }

      let effectiveProviderId: string = (user.user_metadata as any)?.parent_provider_id || user.id

      if (!effectiveProviderId || effectiveProviderId === user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, parent_provider_id")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.role === "provider_employee" && profile.parent_provider_id) {
          effectiveProviderId = profile.parent_provider_id as string
        }
      }

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, client_id, provider_id, service_id, amount, status, paid_at")
        .eq("provider_id", effectiveProviderId)
        .eq("client_id", item.clientId)

      if (ordersError || !orders) {
        console.error("Error fetching client plans for provider", ordersError)
        setClientPlans([])
        return
      }

      if (!orders.length) {
        setClientPlans([])
        return
      }

      const serviceIds = Array.from(new Set(orders.map((o) => o.service_id))) as number[]
      const orderIds = orders.map((o) => o.id as string)

      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds)

      const { data: contracts } = await supabase
        .from("contracts")
        .select("order_id, status")
        .in("order_id", orderIds)

      const mapped: ClientPlanForProvider[] = orders.map((o: any) => {
        const service = services?.find((s: any) => s.id === o.service_id)
        const contract = contracts?.find((c: any) => c.order_id === o.id)
        const status = (contract?.status as string | undefined) || (o.status as string)

        return {
          orderId: o.id as string,
          serviceName: service?.name || null,
          amount: Number(o.amount || 0),
          paidAt: (o.paid_at as string | null) || null,
          status,
        }
      })

      setClientPlans(mapped)
    } finally {
      setLoadingClientPlans(false)
    }
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
                  onClick={() => handleOpenClientDetail(item)}
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
          <Card className="w-full max-w-3xl max-h-[80vh] p-6 space-y-4 bg-white overflow-hidden flex flex-col">
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

            <div className="pt-4 border-t mt-2 flex-1 min-h-0 flex flex-col text-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">Planes contratados con tu empresa</p>
                <div className="flex gap-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded-md border ${
                      planStatusFilter === "all"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanStatusFilter("all")}
                  >
                    Todos
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md border ${
                      planStatusFilter === "active"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanStatusFilter("active")}
                  >
                    Activos
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md border ${
                      planStatusFilter === "cancelled"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanStatusFilter("cancelled")}
                  >
                    Cancelados
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {loadingClientPlans && (
                  <p className="text-xs text-muted-foreground">Cargando planes...</p>
                )}
                {!loadingClientPlans && (!clientPlans || clientPlans.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Este cliente no tiene planes con pagos registrados.
                  </p>
                )}
                {!loadingClientPlans && clientPlans && clientPlans.length > 0 && (
                  <div className="space-y-3">
                    {clientPlans
                      .filter((plan) => {
                        if (planStatusFilter === "all") return true
                        if (planStatusFilter === "active") return plan.status !== "cancelled"
                        return plan.status === "cancelled"
                      })
                      .map((plan) => (
                        <div
                          key={plan.orderId}
                          className="border rounded-md px-3 py-2 flex flex-col gap-1 bg-gray-50"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-medium">
                                {plan.serviceName || "Plan sin nombre"}
                              </p>
                              {plan.paidAt && (
                                <p className="text-xs text-muted-foreground">
                                  Inicio / último pago: {new Date(plan.paidAt).toLocaleDateString("es-AR")}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Importe mensual: ${plan.amount}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                plan.status === "cancelled"
                                  ? "bg-red-50 text-red-700 border border-red-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}
                            >
                              {plan.status === "cancelled" ? "Cancelado" : "Activo"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              className="px-2 py-1 text-xs border rounded-md hover:bg-white"
                              onClick={() => handleOpenContractPdf(plan.orderId)}
                            >
                              Contrato PDF
                            </button>
                            <button
                              className="px-2 py-1 text-xs border rounded-md hover:bg-white"
                              onClick={() => handleOpenLastReceiptPdf(plan.orderId)}
                              disabled={loadingReceipt}
                            >
                              {loadingReceipt ? "Abriendo comprobante..." : "Último comprobante PDF"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t mt-2">
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
