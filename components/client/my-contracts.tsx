"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, User, FileText, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface ClientContractItem {
  id: string
  contractId: string | null
  providerName: string
  providerPhone: string | null
  serviceName: string | null
  serviceDescription: string | null
  amount: number
  status: string
  paidAt: string | null
}

export function MyContracts() {
  const [items, setItems] = useState<ClientContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ClientContractItem | null>(null)
  const [contractText, setContractText] = useState<string | null>(null)
  const [contractNumber, setContractNumber] = useState<string | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)

  const [receipts, setReceipts] = useState<
    | {
        receiptNumber: number
        details: string | null
        amount: number
        issuedAt: string
        periodMonth: number | null
        periodYear: number | null
      }[]
    | null
  >(null)
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState<number | null>(null)
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
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

      // 1) Traer órdenes pagadas del cliente
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, provider_id, service_id, amount, status, paid_at")
        .eq("client_id", user.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })

      if (ordersError || !orders) {
        console.error("Error fetching client orders", ordersError)
        setItems([])
        setLoading(false)
        return
      }

      if (!orders.length) {
        setItems([])
        setLoading(false)
        return
      }

      const providerIds = Array.from(new Set(orders.map((o) => o.provider_id)))
      const serviceIds = Array.from(new Set(orders.map((o) => o.service_id).filter(Boolean))) as number[]
      const orderIds = orders.map((o) => o.id as string)

      // 2) Datos de proveedores
      const { data: providers } = await supabase
        .from("provider_profiles")
        .select("id, business_name, address")
        .in("id", providerIds)

      // 3) Datos de servicios (incluyendo descripción para mostrar todo el detalle del plan)
      const { data: services } = serviceIds.length
        ? await supabase
            .from("services")
            .select("id, name, description")
            .in("id", serviceIds)
        : { data: [] as any[] }

      // 4) Contratos asociados a esas órdenes (para poder dar de baja)
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, order_id, status")
        .in("order_id", orderIds)

      if (contractsError) {
        console.error("Error fetching contracts for client orders", contractsError)
      }

      const mapped: ClientContractItem[] = orders
        .map((o: any) => {
          const provider = providers?.find((p: any) => p.id === o.provider_id)
          const service = services?.find((s: any) => s.id === o.service_id)
          const contract = contracts?.find((c: any) => c.order_id === o.id)

          // Si existe un contrato cancelado, no lo mostramos
          if (contract && contract.status === "cancelled") {
            return null
          }

          return {
            id: o.id as string,
            // Puede no haber contrato todavía; en ese caso, mostramos el plan pero sin permitir baja
            contractId: (contract?.id as string | undefined) ?? null,
            providerName: provider?.business_name || "Proveedor",
            providerPhone: provider?.address || null,
            serviceName: service?.name || null,
            serviceDescription: service?.description || null,
            amount: Number(o.amount || 0),
            status: (contract?.status as string | undefined) ?? (o.status as string),
            paidAt: (o.paid_at as string | null) || null,
          }
        })
        .filter((c): c is ClientContractItem => c !== null)

      setItems(mapped)
      setLoading(false)
    }

    loadContracts()
  }, [])

  const normalize = (value: string | null | undefined) => (value || "").toLowerCase().trim()

  const filteredItems: ClientContractItem[] = items.filter((item: ClientContractItem) => {
    const term = searchTerm.toLowerCase().trim()

    if (term) {
      const inProvider = normalize(item.providerName).includes(term)
      const inService = normalize(item.serviceName).includes(term)
      if (!inProvider && !inService) return false
    }

    if (filterDate && item.paidAt) {
      const startDate = new Date(item.paidAt).toISOString().slice(0, 10)
      if (startDate !== filterDate) return false
    }

    return true
  })

  const handleViewContract = async (contract: ClientContractItem) => {
    setLoadingContract(true)
    setContractText(null)
    setContractNumber(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("contracts")
        .select("contract_text, contract_number")
        .eq("order_id", contract.id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching contract text for client", error)
        toast({
          title: "No se pudo cargar el contrato",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      if (!data?.contract_text) {
        toast({
          title: "Contrato no disponible",
          description: "Todavía no hay un texto de contrato generado para esta orden.",
        })
        return
      }

      setContractText(data.contract_text as string)
      setContractNumber((data.contract_number as string) || null)
    } finally {
      setLoadingContract(false)
    }
  }

  const handlePrintContract = () => {
    if (!contractText) {
      toast({
        title: "Primero abre el contrato",
        description: "Haz clic en 'Ver contrato' antes de imprimir.",
      })
      return
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer")
    if (!printWindow) return

    const title = contractNumber ? `Contrato ${contractNumber}` : "Contrato"
    printWindow.document.write(`<!doctype html><html><head><title>${title}</title></head><body>`)
    printWindow.document.write(`<h1>${title}</h1>`)
    printWindow.document.write(`<pre style="white-space:pre-wrap;font-family:inherit;">${
      contractText.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }</pre>`)
    printWindow.document.write("</body></html>")
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleLoadReceipts = async (contract: ClientContractItem) => {
    setLoadingReceipts(true)
    setReceipts(null)
    setSelectedReceiptIndex(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("payment_receipts")
        .select("receipt_number, details, amount, issued_at, period_month, period_year")
        .eq("order_id", contract.id)
        .order("issued_at", { ascending: false })

      if (error) {
        console.error("Error fetching payment receipts for client", error)
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
        receiptNumber: r.receipt_number as number,
        details: (r.details as string) ?? null,
        amount: Number(r.amount || 0),
        issuedAt: r.issued_at as string,
        periodMonth: (r.period_month as number | null) ?? null,
        periodYear: (r.period_year as number | null) ?? null,
      }))

      setReceipts(mapped)
      setSelectedReceiptIndex(0)
    } finally {
      setLoadingReceipts(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!receipts || selectedReceiptIndex === null) {
      toast({
        title: "Primero elige un comprobante",
        description: "Carga y selecciona el comprobante que deseas imprimir.",
      })
      return
    }

    const receipt = receipts[selectedReceiptIndex]
    const printWindow = window.open("", "_blank", "noopener,noreferrer")
    if (!printWindow) return

    const fecha = new Date(receipt.issuedAt).toLocaleString("es-AR")
    const encabezado = `Recibo N° ${receipt.receiptNumber} - Fecha de emisión: ${fecha}`

    printWindow.document.write("<!doctype html><html><head><title>Comprobante de pago</title></head><body>")
    printWindow.document.write(`<h1>${encabezado}</h1>`)
    printWindow.document.write(`<p><strong>Importe pagado:</strong> $${receipt.amount.toFixed(2)}</p>`)
    if (receipt.details) {
      printWindow.document.write(
        `<pre style="white-space:pre-wrap;font-family:inherit;">${receipt.details
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`,
      )
    }
    printWindow.document.write("</body></html>")
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Mis Contratos</h2>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Buscar por proveedor o plan</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Ej: nombre del proveedor o del plan"
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

      {loading && <p>Cargando contratos...</p>}

      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((contract) => (
            <Card key={contract.id} className="p-6 flex flex-col justify-between gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{contract.providerName}</h3>
                  {contract.serviceName && (
                    <p className="text-sm text-muted-foreground">{contract.serviceName}</p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 gap-1 flex items-center">
                  <CheckCircle className="w-4 h-4" />
                  Activo
                </span>
              </div>

              <div className="space-y-2">
                {contract.providerPhone && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{contract.providerPhone}</span>
                  </div>
                )}
                {contract.paidAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Inicio: {new Date(contract.paidAt).toLocaleDateString("es-AR")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span className="font-medium">Importe mensual:</span> ${contract.amount}
                </div>
                {contract.serviceDescription && (
                  <div className="text-sm bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mt-1 text-blue-900">
                    {contract.serviceDescription}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 bg-transparent"
                  onClick={() => {
                    setSelected(contract)
                    setContractText(null)
                    setContractNumber(null)
                    setReceipts(null)
                    setSelectedReceiptIndex(null)
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Ver contrato y comprobantes
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">Detalle del plan</h3>
                <p className="text-sm text-muted-foreground">Proveedor: {selected.providerName}</p>
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
                  <span className="font-medium">Inicio del plan: </span>
                  {new Date(selected.paidAt).toLocaleDateString("es-AR")}
                </p>
              )}
              <p>
                <span className="font-medium">Importe mensual: </span>${selected.amount}
              </p>
              {selected.providerPhone && (
                <p>
                  <span className="font-medium">Dirección / contacto del proveedor: </span>
                  {selected.providerPhone}
                </p>
              )}
            </div>

            {selected.serviceDescription && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">Descripción del plan</p>
                <p className="text-muted-foreground whitespace-pre-line">{selected.serviceDescription}</p>
              </div>
            )}

            <div className="pt-4 space-y-4 border-t mt-2">
              <div className="space-y-2 text-sm">
                <p className="font-medium">Contrato</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingContract}
                    onClick={() => handleViewContract(selected)}
                  >
                    {loadingContract ? "Cargando contrato..." : "Ver contrato"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrintContract}>
                    Imprimir contrato
                  </Button>
                </div>
                {contractText && (
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap max-h-64 overflow-auto">
                    {contractText}
                  </pre>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Comprobantes de pago</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingReceipts}
                    onClick={() => handleLoadReceipts(selected)}
                  >
                    {loadingReceipts ? "Cargando comprobantes..." : "Cargar comprobantes"}
                  </Button>
                  {receipts && receipts.length > 0 && (
                    <select
                      className="border rounded-md px-2 py-1 text-xs"
                      value={selectedReceiptIndex ?? 0}
                      onChange={(e) => setSelectedReceiptIndex(Number(e.target.value))}
                    >
                      {receipts.map((r, idx) => {
                        const labelPeriodo =
                          r.periodMonth && r.periodYear
                            ? `${String(r.periodMonth).padStart(2, "0")}/${r.periodYear}`
                            : new Date(r.issuedAt).toLocaleDateString("es-AR")
                        return (
                          <option key={r.receiptNumber} value={idx}>
                            Recibo {r.receiptNumber} - {labelPeriodo}
                          </option>
                        )
                      })}
                    </select>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                    Imprimir comprobante
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tienes contratos activos aún.</p>
        </Card>
      )}
    </div>
  )
}
