"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Calendar, CheckCircle, Clock, FileText, User } from "lucide-react"

interface ProviderContractItem {
  orderId: string
  contractId: string | null
  clientId: string
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  serviceName: string | null
  serviceDescription: string | null
  amount: number
  paidAt: string | null
}

export function ProviderContracts() {
  const [items, setItems] = useState<ProviderContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProviderContractItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [contractText, setContractText] = useState<string | null>(null)
  const [contractNumber, setContractNumber] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<
    | {
        id: string
        receiptNumber: number
        issuedAt: string
      }[]
    | null
  >(null)
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState<number | null>(null)
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<ProviderContractItem | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    async function loadContracts() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      // Determinar qué ID de proveedor usar.
      // 1) Si en los metadatos del usuario viene parent_provider_id (empleado), usamos ese.
      let effectiveProviderId: string = (user.user_metadata as any)?.parent_provider_id || user.id

      // 2) Como respaldo, consultamos profiles por si faltara en los metadatos.
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
        .select("id, client_id, provider_id, service_id, status, amount, paid_at")
        .eq("provider_id", effectiveProviderId)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })

      if (ordersError || !orders) {
        console.error("Error fetching provider contracts orders", ordersError)
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
      const serviceIds = Array.from(new Set(orders.map((o) => o.service_id))) as number[]
      const orderIds = orders.map((o) => o.id as string)

      const { data: clients } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", clientIds)

      const { data: services } = await supabase
        .from("services")
        .select("id, name, description")
        .in("id", serviceIds)

      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, order_id, status")
        .in("order_id", orderIds)

      if (contractsError) {
        console.error("Error fetching provider contracts", contractsError)
      }

      const mapped: ProviderContractItem[] = orders
        .map((o: any) => {
          const client = clients?.find((c: any) => c.id === o.client_id)
          const service = services?.find((s: any) => s.id === o.service_id)
          const contract = contracts?.find((c: any) => c.order_id === o.id)

          if (contract && contract.status === "cancelled") {
            return null
          }

          return {
            orderId: o.id as string,
            contractId: (contract?.id as string | undefined) ?? null,
            clientId: o.client_id as string,
            clientName: (client?.full_name as string) || null,
            clientEmail: (client?.email as string) || null,
            clientPhone: (client?.phone as string) || null,
            serviceName: service?.name || null,
            serviceDescription: service?.description || null,
            amount: Number(o.amount || 0),
            paidAt: (o.paid_at as string | null) || null,
          }
        })
        .filter((c): c is ProviderContractItem => c !== null)

      setItems(mapped)
      setLoading(false)
    }

    loadContracts()
  }, [])

  const handleViewContract = (item: ProviderContractItem) => {
    const url = `/api/contracts/pdf?order_id=${encodeURIComponent(item.orderId)}`
    const win = window.open(url, "_blank", "noopener,noreferrer")
    if (!win) {
      toast({
        title: "Ventana bloqueada",
        description: "Permite las ventanas emergentes para poder ver el contrato en PDF.",
      })
    }
  }

  const handleLoadReceipts = async (item: ProviderContractItem) => {
    setLoadingReceipts(true)
    setReceipts(null)
    setSelectedReceiptIndex(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("payment_receipts")
        .select("id, receipt_number, issued_at")
        .eq("order_id", item.orderId)
        .order("issued_at", { ascending: false })

      if (error) {
        console.error("Error fetching payment receipts for provider", error)
        toast({
          title: "No se pudieron cargar los comprobantes",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      if (!data || data.length === 0) {
        toast({
          title: "Sin comprobantes",
          description: "Todavía no hay comprobantes de pago para este plan.",
        })
        return
      }

      const mapped = data.map((r: any) => ({
        id: r.id as string,
        receiptNumber: r.receipt_number as number,
        issuedAt: r.issued_at as string,
      }))

      setReceipts(mapped)
      setSelectedReceiptIndex(0)
    } finally {
      setLoadingReceipts(false)
    }
  }

  const handleOpenReceiptPdf = () => {
    if (!receipts || selectedReceiptIndex === null) {
      toast({
        title: "Primero elige un comprobante",
        description: "Selecciona el comprobante que deseas ver en PDF.",
      })
      return
    }

    const receipt = receipts[selectedReceiptIndex]
    const url = `/api/receipts/pdf?receipt_id=${encodeURIComponent(receipt.id)}`
    const win = window.open(url, "_blank", "noopener,noreferrer")
    if (!win) {
      toast({
        title: "Ventana bloqueada",
        description: "Permite las ventanas emergentes para poder ver el comprobante en PDF.",
      })
    }
  }

  const normalize = (value: string | null | undefined) => (value || "").toLowerCase().trim()

  const filteredItems: ProviderContractItem[] = items.filter((item: ProviderContractItem) => {
    const term = searchTerm.toLowerCase().trim()

    if (term) {
      const inClient = normalize(item.clientName).includes(term)
      const inService = normalize(item.serviceName).includes(term)
      if (!inClient && !inService) return false
    }

    if (filterDate && item.paidAt) {
      const paidDate = new Date(item.paidAt).toISOString().slice(0, 10)
      if (paidDate !== filterDate) return false
    }

    return true
  })

  const handleOpenCancelModal = (contract: ProviderContractItem) => {
    setCancelTarget(contract)
    setCancelReason("")
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return

    const reason = cancelReason.trim()
    if (!reason) {
      toast({
        title: "Motivo requerido",
        description: "Ingresa un motivo para dar de baja el contrato.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/contracts/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: cancelTarget.orderId, reason }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({
          title: "No se pudo dar de baja el contrato",
          description: (data as any)?.error || "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      setItems((prev) => prev.filter((c) => c.orderId !== cancelTarget.orderId))
      if (selected?.orderId === cancelTarget.orderId) {
        setSelected(null)
        setContractText(null)
        setContractNumber(null)
        setReceipts(null)
        setSelectedReceiptIndex(null)
      }

      toast({
        title: "Contrato dado de baja",
        description: "El contrato fue cancelado y ya no generará nuevos pagos.",
      })
      setCancelTarget(null)
      setCancelReason("")
    } catch (e) {
      console.error("Error cancelling provider contract", e)
      toast({
        title: "No se pudo dar de baja el contrato",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  const quotaStatusLabel = (paidAt: string | null) => {
    if (!paidAt) return "Sin pagos registrados"
    const last = new Date(paidAt)
    const now = new Date()
    if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
      return "Cuota de este mes abonada"
    }
    return "Sin pago registrado este mes"
  }

  if (loading) {
    return <p>Cargando contratos de tus clientes...</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Contratos de Clientes</h2>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Buscar por cliente o plan</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Ej: nombre del cliente o del plan"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Filtrar por fecha de inicio de contrato</label>
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
          <p className="text-muted-foreground">Aún no tienes clientes abonando planes.</p>
        </Card>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.orderId} className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-lg">{item.clientName || "Cliente sin nombre"}</h3>
                  {item.clientEmail && <p className="text-xs text-muted-foreground">{item.clientEmail}</p>}
                  {item.clientPhone && <p className="text-xs text-muted-foreground">Tel: {item.clientPhone}</p>}
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Activo
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {item.serviceName && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Plan: </span>
                    {item.serviceName}
                  </p>
                )}
                {item.paidAt && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Último pago: {new Date(item.paidAt).toLocaleDateString("es-AR")}
                    </span>
                  </p>
                )}
                <p className="text-emerald-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Importe mensual: ${item.amount}</span>
                </p>
                <p className="text-xs text-muted-foreground">{quotaStatusLabel(item.paidAt)}</p>
              </div>

              {item.serviceDescription && (
                <div className="text-sm bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mt-1 text-blue-900">
                  {item.serviceDescription}
                </div>
              )}

              <div className="flex justify-end pt-2 gap-2 border-t pt-4 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleOpenCancelModal(item)}
                >
                  Dar de baja contrato
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setSelected(item)
                    await handleLoadReceipts(item)
                  }}
                >
                  Ver detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-white">
            <h3 className="text-lg font-semibold">Dar de baja contrato</h3>
            <p className="text-sm text-muted-foreground">
              Estás por dar de baja el contrato del cliente {cancelTarget.clientName || cancelTarget.clientEmail || "Sin nombre"}.
            </p>
            <p className="text-xs text-muted-foreground">
              El motivo será notificado al cliente junto con la baja del plan.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de la baja</label>
              <textarea
                className="w-full min-h-[90px] border rounded-md px-3 py-2 text-sm"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Describe brevemente por qué se da de baja este contrato."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason("") }}>
                Volver
              </Button>
              <Button variant="destructive" onClick={handleConfirmCancel}>
                Confirmar baja
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">Detalle del contrato</h3>
                <p className="text-sm text-muted-foreground">
                  Cliente: {selected.clientName || selected.clientEmail || "Sin nombre"}
                </p>
                {selected.serviceName && (
                  <p className="text-sm text-muted-foreground">Plan: {selected.serviceName}</p>
                )}
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Activo
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              {selected.paidAt && (
                <p>
                  <span className="font-medium">Último pago: </span>
                  {new Date(selected.paidAt).toLocaleDateString("es-AR")}
                </p>
              )}
              <p>
                <span className="font-medium">Importe mensual: </span>${selected.amount}
              </p>
              <p>
                <span className="font-medium">Estado de cuota: </span>
                {quotaStatusLabel(selected.paidAt)}
              </p>
            </div>

            {selected.serviceDescription && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">Descripción del plan</p>
                <p className="text-muted-foreground whitespace-pre-line">{selected.serviceDescription}</p>
              </div>
            )}

            {contractText && (
              <div className="space-y-1 text-sm mt-4">
                <p className="font-medium">Contrato generado</p>
                {contractNumber && (
                  <p className="text-xs text-muted-foreground mb-1">Número: {contractNumber}</p>
                )}
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap max-h-64 overflow-auto">
                  {contractText}
                </pre>
              </div>
            )}

            <div className="pt-4 space-y-2 border-t mt-2 text-sm">
              <p className="font-medium">Selecciona un comprobante</p>
              <div className="flex flex-wrap gap-2 items-center">
                {receipts && receipts.length > 0 ? (
                  <>
                    <select
                      className="border rounded-md px-2 py-1 text-xs"
                      value={selectedReceiptIndex ?? 0}
                      onChange={(e) => setSelectedReceiptIndex(Number(e.target.value))}
                    >
                      {receipts.map((r, idx) => {
                        const issuedDate = new Date(r.issuedAt)
                        const mes = String(issuedDate.getMonth() + 1).padStart(2, "0")
                        const anio = issuedDate.getFullYear()
                        const labelPeriodo = `${mes}/${anio}`

                        return (
                          <option key={r.receiptNumber} value={idx}>
                            Recibo {r.receiptNumber} - {labelPeriodo}
                          </option>
                        )
                      })}
                    </select>
                    <Button variant="outline" size="sm" onClick={handleOpenReceiptPdf}>
                      Comprobante PDF
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {loadingReceipts
                      ? "Cargando comprobantes..."
                      : "Todavía no hay comprobantes de pago para este plan."}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selected && handleViewContract(selected)}
              >
                Ver contrato
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
