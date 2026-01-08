"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DollarSign, Calendar, Clock, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { summarizeServiceAreas } from "@/lib/utils"

interface QuotationItem {
  id: number
  providerId: string
  serviceId: number | null
  providerName: string
  serviceName: string | null
  serviceDescription: string | null
  serviceBasePrice: number | null
  serviceMaxMembers: number | null
  serviceAreas: string[]
  serviceImages: string[]
  serviceVideos: string[]
  servicePdfs: string[]
  status: string
  requestedFor: string | null
  notes: string | null
  createdAt: string
  proposedPrice: number | null
  providerNotes: string | null
  extraDocsRequested: boolean
  extraDocsMessage: string | null
  extraDocsUrls: string[]
  extraDocsClientText: string | null
  paymentEnabled: boolean
  rejectedBy: string | null
  clientFullName: string | null
  clientPhone: string | null
  clientEmail: string | null
  clientDni: string | null
  clientAddress: string | null
  clientAge: number | null
  familyMembers: { full_name: string | null; dni: string | null; age: number | null }[]
}

export function MyQuotations() {
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<QuotationItem | null>(null)
  const [uploadingExtraDocs, setUploadingExtraDocs] = useState(false)
  const [extraDocsTextInput, setExtraDocsTextInput] = useState("")
  const [pendingExtraFiles, setPendingExtraFiles] = useState<File[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    async function loadQuotations() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      const { data: quotations, error } = await supabase
        .from("quotations")
        .select(
          "id, provider_id, service_id, status, requested_for, notes, created_at, proposed_price, provider_notes, extra_docs_requested, extra_docs_message, extra_docs_client_text, payment_enabled, rejected_by, client_full_name, client_phone, client_email, client_dni, client_address, client_age, family_members",
        )
        .eq("client_id", user.id)
        .is("client_deleted_at", null)
        .order("created_at", { ascending: false })

      if (error || !quotations) {
        console.error("Error fetching quotations", error)
        setItems([])
        setLoading(false)
        return
      }

      const providerIds = Array.from(new Set(quotations.map((q) => q.provider_id)))
      const serviceIds = Array.from(new Set(quotations.map((q) => q.service_id).filter(Boolean))) as number[]
      const quotationIds = quotations.map((q) => q.id as number)

      const { data: providers } = await supabase
        .from("provider_profiles")
        .select("id, business_name")
        .in("id", providerIds)

      const { data: services } = serviceIds.length
        ? await supabase
            .from("services")
            .select(
              "id, name, description, base_price, max_members, service_areas, image_urls, video_urls, pdf_urls",
            )
            .in("id", serviceIds)
        : { data: [] as any[] }

      // Órdenes pagadas asociadas a estas cotizaciones: si ya existe una orden paid, no se debe mostrar la cotización al cliente
      const { data: paidOrders } = quotationIds.length
        ? await supabase
            .from("orders")
            .select("id, quotation_id, status")
            .in("quotation_id", quotationIds)
            .eq("status", "paid")
        : { data: [] as any[] }

      const quotationIdsWithPaidOrder = new Set(
        (paidOrders || []).map((o: any) => o.quotation_id as number | null).filter((id): id is number => id != null),
      )

      const itemsMapped: QuotationItem[] = quotations
        // Ocultamos cotizaciones que ya generaron una orden pagada (ya están en contratos)
        .filter((q: any) => !quotationIdsWithPaidOrder.has(q.id as number))
        .map((q: any) => {
          const provider = providers?.find((p: any) => p.id === q.provider_id)
          const service = services?.find((s: any) => s.id === q.service_id)

          const extraDocsRequested = (q.extra_docs_requested as boolean | null) ?? false
          const rawPaymentEnabled = q.payment_enabled as boolean | null

          return {
            id: q.id as number,
            providerId: q.provider_id as string,
            serviceId: (q.service_id as number | null) ?? null,
            providerName: provider?.business_name || "Proveedor",
            serviceName: service?.name || null,
            serviceDescription: (service?.description as string | null) || null,
            serviceBasePrice: service?.base_price != null ? Number(service.base_price) : null,
            serviceMaxMembers: (service?.max_members as number | null) ?? null,
            serviceAreas: (service?.service_areas as string[] | null) || [],
            serviceImages: (service?.image_urls as string[] | null) || [],
            serviceVideos: (service?.video_urls as string[] | null) || [],
            servicePdfs: (service?.pdf_urls as string[] | null) || [],
            status: q.status as string,
            requestedFor: q.requested_for as string | null,
            notes: q.notes as string | null,
            createdAt: q.created_at as string,
            proposedPrice: q.proposed_price != null ? Number(q.proposed_price) : null,
            providerNotes: (q.provider_notes as string | null) || null,
            extraDocsRequested,
            extraDocsMessage: (q.extra_docs_message as string | null) || null,
            extraDocsUrls: (q.extra_docs_urls as string[] | null) || [],
            extraDocsClientText: (q.extra_docs_client_text as string | null) || null,
            paymentEnabled:
              rawPaymentEnabled != null
                ? rawPaymentEnabled
                : // Si no hay valor guardado, asumimos habilitado solo cuando no se pidieron documentos extra
                  !extraDocsRequested,
            rejectedBy: (q.rejected_by as string | null) || null,
            clientFullName: (q.client_full_name as string) || null,
            clientPhone: (q.client_phone as string) || null,
            clientEmail: (q.client_email as string) || null,
            clientDni: (q.client_dni as string) || null,
            clientAddress: (q.client_address as string) || null,
            clientAge: (q.client_age as number | null) ?? null,
            familyMembers: (q.family_members as any[] | null) || [],
          }
        })

      setItems(itemsMapped)
      setLoading(false)
    }

    loadQuotations()
  }, [])

  const normalize = (value: string | null | undefined) => (value || "").toLowerCase().trim()

  const filteredItems: QuotationItem[] = items.filter((item: QuotationItem) => {
    const term = searchTerm.toLowerCase().trim()

    if (term) {
      const inProvider = normalize(item.providerName).includes(term)
      const inService = normalize(item.serviceName).includes(term)
      if (!inProvider && !inService) return false
    }

    if (filterDate) {
      const createdDate = new Date(item.createdAt).toISOString().slice(0, 10)
      if (createdDate !== filterDate) return false
    }

    return true
  })

  const statusLabel = (status: string, rejectedBy?: string | null) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "accepted":
        return "Aprobada"
      case "rejected":
        if (rejectedBy === "provider") return "Rechazada por el proveedor"
        if (rejectedBy === "client") return "Rechazada por ti"
        return "Rechazada"
      case "expired":
        return "Vencida"
      default:
        return status
    }
  }

  const handleCancelRequest = async (id: number) => {
    const supabase = createClient()

    // Aseguramos que se borre/oculte solo la cotización del usuario autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Sesión requerida",
        description: "Debes iniciar sesión para cancelar una solicitud.",
        variant: "destructive",
      })
      return
    }

    // Obtenemos el estado de borrado actual para decidir si hacemos borrado lógico o físico
    const { data: quotation, error: fetchError } = await supabase
      .from("quotations")
      .select("id, client_id, client_deleted_at, provider_deleted_at")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching quotation before delete", fetchError)
      toast({
        title: "No se pudo cancelar la solicitud",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
      return
    }

    if (!quotation || quotation.client_id !== user.id) {
      toast({
        title: "No se encontró la cotización",
        description: "La solicitud no pudo ser eliminada. Verifica nuevamente más tarde.",
        variant: "destructive",
      })
      return
    }

    // Antes de eliminar/cancelar, marcamos como rechazada por el cliente
    await supabase.from("quotations").update({ status: "rejected", rejected_by: "client" }).eq("id", id)

    // Si el proveedor ya la tenía eliminada, borramos definitivamente la fila
    if (quotation.provider_deleted_at) {
      const { error: hardDeleteError } = await supabase.from("quotations").delete().eq("id", id)

      if (hardDeleteError) {
        console.error("Error hard-deleting quotation", hardDeleteError)
        toast({
          title: "No se pudo cancelar la solicitud",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }
    } else {
      // Caso normal: marcamos como eliminada para el cliente pero la fila sigue existiendo para el proveedor
      const { error: softDeleteError } = await supabase
        .from("quotations")
        .update({ client_deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("client_id", user.id)

      if (softDeleteError) {
        console.error("Error soft-deleting quotation for client", softDeleteError)
        toast({
          title: "No se pudo cancelar la solicitud",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }
    }

    setItems((prev) => prev.filter((q) => q.id !== id))
    if (selected?.id === id) setSelected(null)

    toast({
      title: "Solicitud cancelada",
      description: "La cotización fue eliminada correctamente.",
    })
  }

  const handleRejectQuotation = async (id: number) => {
    const confirmed = window.confirm(
      "¿Seguro que deseas rechazar esta cotización del proveedor? Podrás solicitar otra más adelante.",
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from("quotations")
      .update({ status: "rejected", rejected_by: "client" })
      .eq("id", id)
    if (error) {
      console.error("Error rejecting quotation", error)
      toast({
        title: "No se pudo rechazar la cotización",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
      return
    }

    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, status: "rejected" } : q)))
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status: "rejected" } : prev))

    toast({
      title: "Cotización rechazada",
      description: "Has rechazado la propuesta del proveedor.",
    })
  }

  const handlePayQuotation = async (id: number) => {
    const quotation = items.find((q) => q.id === id)
    if (!quotation) {
      toast({
        title: "Cotización no encontrada",
        description: "No se pudo localizar la cotización seleccionada.",
        variant: "destructive",
      })
      return
    }

    if (quotation.proposedPrice == null || Number.isNaN(quotation.proposedPrice)) {
      toast({
        title: "Falta la propuesta del proveedor",
        description: "El proveedor aún no definió un importe para esta cotización.",
        variant: "destructive",
      })
      return
    }

    if (!quotation.serviceId) {
      toast({
        title: "Cotización sin plan asociado",
        description: "Esta cotización no está vinculada a un plan específico, por lo que no puede generar un contrato.",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Sesión requerida",
        description: "Debes iniciar sesión para abonar una cotización.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch('/api/mercadopago/checkout/one-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quotationId: id }),
      })

      const json = (await res.json().catch(() => null)) as any

      if (!res.ok) {
        toast({
          title: 'No se pudo iniciar el pago',
          description: json?.error || 'Intenta nuevamente en unos minutos.',
          variant: 'destructive',
        })
        return
      }

      const initPoint = json?.init_point as string | undefined
      if (!initPoint) {
        toast({
          title: 'No se pudo iniciar el pago',
          description: 'Respuesta inválida del servidor.',
          variant: 'destructive',
        })
        return
      }

      window.location.href = initPoint
    } catch (e) {
      console.error('Error starting Mercado Pago checkout', e)
      toast({
        title: 'No se pudo iniciar el pago',
        description: 'Intenta nuevamente en unos minutos.',
        variant: 'destructive',
      })
    }
  }

  const statusClasses = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "rejected":
        return "bg-red-100 text-red-700"
      case "expired":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Mis Cotizaciones</h2>

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
          <label className="text-sm font-medium">Filtrar por fecha de solicitud</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {loading && <p>Cargando cotizaciones...</p>}

      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((q) => (
            <Card key={q.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{q.providerName}</h3>
                  {q.serviceName && (
                    <p className="text-sm text-muted-foreground">Plan: {q.serviceName}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(q.status)}`}>
                  {statusLabel(q.status, q.rejectedBy)}
                </span>
              </div>

              <div className="space-y-2">
                {q.requestedFor && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Fecha solicitada: {new Date(q.requestedFor).toLocaleDateString("es-AR")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>En espera de propuesta del proveedor</span>
                </div>
              </div>

              {q.notes && <p className="text-sm line-clamp-2">{q.notes}</p>}

              <div className="pt-3 flex justify-between items-center gap-2">
                <div className="flex gap-2 items-center">
                  {q.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelRequest(q.id)}
                    >
                      Cancelar solicitud
                    </Button>
                  )}
                  {q.status === "accepted" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleRejectQuotation(q.id)}
                      >
                        Rechazar cotización
                      </Button>
                      {(!q.extraDocsRequested || q.paymentEnabled) ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handlePayQuotation(q.id)}
                        >
                          Abonar cotización
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {q.extraDocsUrls.length > 0 || (q.extraDocsClientText && q.extraDocsClientText.trim() !== "")
                            ? "El proveedor está revisando tu documentación."
                            : "El proveedor está solicitando documentación o datos extras."}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8"
                    onClick={() => handleCancelRequest(q.id)}
                    aria-label="Eliminar cotización"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(q)
                      setExtraDocsTextInput(q.extraDocsClientText || "")
                    }}
                  >
                    Ver detalle
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tienes cotizaciones aún</p>
          <p className="text-sm text-muted-foreground mt-2">Solicita una cotización para comenzar</p>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 space-y-4 bg-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">Detalle de la solicitud</h3>
                <p className="text-sm text-muted-foreground">Proveedor: {selected.providerName}</p>
                {selected.serviceName && (
                  <p className="text-sm text-muted-foreground">Plan: {selected.serviceName}</p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(selected.status)}`}>
                {statusLabel(selected.status, selected.rejectedBy)}
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Fecha de envío de la solicitud: </span>
                {new Date(selected.createdAt).toLocaleDateString("es-AR")}
              </p>
              {selected.proposedPrice != null && (
                <p>
                  <span className="font-medium">Precio propuesto por el proveedor: </span>${selected.proposedPrice}
                </p>
              )}
              {selected.serviceBasePrice != null && (
                <p>
                  <span className="font-medium">Precio base del plan: </span>${selected.serviceBasePrice}
                </p>
              )}
              {selected.serviceMaxMembers != null && (
                <p>
                  <span className="font-medium">Cantidad máxima de integrantes: </span>
                  {selected.serviceMaxMembers}
                </p>
              )}
              {selected.serviceAreas.length > 0 && (
                <p>
                  <span className="font-medium">Zonas de cobertura: </span>
                  {summarizeServiceAreas(selected.serviceAreas).join(", ")}
                </p>
              )}
            </div>

            {selected.serviceDescription && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">Descripción del servicio</p>
                <p className="text-muted-foreground whitespace-pre-line">{selected.serviceDescription}</p>
              </div>
            )}

            {(selected.serviceImages.length > 0 || selected.servicePdfs.length > 0 ||
              selected.serviceVideos.length > 0) && (
              <div className="space-y-2 text-sm">
                {selected.serviceImages.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium">Imágenes del plan</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.serviceImages.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-20 h-20 rounded-md overflow-hidden border bg-muted"
                        >
                          <img src={url} alt="Imagen del plan" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {selected.servicePdfs.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium">Documentos y PDFs</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {selected.servicePdfs.map((url, idx) => (
                        <li key={idx}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Ver documento {idx + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.serviceVideos.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium">Videos del servicio</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {selected.serviceVideos.map((url, idx) => (
                        <li key={idx}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Ver video {idx + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {(selected.providerNotes || selected.extraDocsRequested) && (
              <div className="space-y-2 text-sm">
                {selected.providerNotes && (
                  <div className="space-y-1">
                    <p className="font-medium">Condiciones y notas del proveedor</p>
                    <p className="text-muted-foreground whitespace-pre-line">{selected.providerNotes}</p>
                  </div>
                )}
                {selected.extraDocsRequested && (
                  <div className="mt-2 md:mt-3 border rounded-md p-3 bg-gray-50 space-y-2">
                    <div className="space-y-1">
                      <p className="font-medium">Documentación extra solicitada</p>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {selected.extraDocsMessage || "El proveedor solicitó documentación o información adicional."}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium">Subir nueva documentación</p>
                      <p className="text-xs text-muted-foreground">
                        Adjuntá aquí las imágenes o documentos que te pidió el proveedor.
                      </p>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        disabled={uploadingExtraDocs}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const files = e.target.files
                          if (!files || files.length === 0) {
                            setPendingExtraFiles([])
                            return
                          }
                          setPendingExtraFiles(Array.from(files) as File[])
                        }}
                      />
                      {uploadingExtraDocs && (
                        <p className="text-xs text-muted-foreground">Subiendo documentación...</p>
                      )}
                      {!uploadingExtraDocs && pendingExtraFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {pendingExtraFiles.length} archivo(s) seleccionado(s) para enviar.
                        </p>
                      )}

                      <div className="pt-2 border-t mt-2 space-y-1">
                        <p className="text-xs font-medium">Escribir información adicional</p>
                        <textarea
                          className="w-full min-h-[70px] border rounded-md px-2 py-1 text-xs bg-white"
                          placeholder="Ej: números de trámite, aclaraciones sobre las imágenes, datos que pidió el proveedor, etc."
                          value={extraDocsTextInput}
                          onChange={(e) => setExtraDocsTextInput(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={uploadingExtraDocs}
                          onClick={async () => {
                            if (!selected) return

                            setUploadingExtraDocs(true)
                            try {
                              const supabase = createClient()
                              const {
                                data: { user },
                              } = await supabase.auth.getUser()

                              if (!user) {
                                toast({
                                  title: "Sesión requerida",
                                  description: "Debes iniciar sesión para enviar documentación.",
                                  variant: "destructive",
                                })
                                setUploadingExtraDocs(false)
                                return
                              }

                              const bucket = supabase.storage.from("quotation-files")
                              const uploadedUrls: string[] = []

                              if (pendingExtraFiles.length > 0) {
                                for (const file of pendingExtraFiles) {
                                  const ext = file.name.split(".").pop() || "bin"
                                  const path = `extra/${user.id}/${selected.id}/${Date.now()}-${Math.random()
                                    .toString(36)
                                    .slice(2)}.${ext}`

                                  const { error: uploadError } = await bucket.upload(path, file, {
                                    cacheControl: "3600",
                                    upsert: false,
                                  })

                                  if (uploadError) {
                                    console.error("Error uploading extra doc", uploadError)
                                    continue
                                  }

                                  const { data } = bucket.getPublicUrl(path)
                                  if (data?.publicUrl) {
                                    uploadedUrls.push(data.publicUrl)
                                  }
                                }
                              }

                              const newUrls =
                                uploadedUrls.length > 0
                                  ? [...(selected.extraDocsUrls || []), ...uploadedUrls]
                                  : selected.extraDocsUrls || []

                              const { error } = await supabase
                                .from("quotations")
                                .update({
                                  extra_docs_urls: newUrls,
                                  extra_docs_client_text: extraDocsTextInput || null,
                                })
                                .eq("id", selected.id)

                              if (error) {
                                console.error("Error saving extra docs payload", error)
                                toast({
                                  title: "No se pudo enviar la documentación",
                                  description: "Intenta nuevamente en unos minutos.",
                                  variant: "destructive",
                                })
                                setUploadingExtraDocs(false)
                                return
                              }

                              setItems((prev) =>
                                prev.map((q) =>
                                  q.id === selected.id
                                    ? {
                                        ...q,
                                        extraDocsUrls: newUrls,
                                        extraDocsClientText: extraDocsTextInput || null,
                                      }
                                    : q,
                                ),
                              )
                              setSelected((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      extraDocsUrls: newUrls,
                                      extraDocsClientText: extraDocsTextInput || null,
                                    }
                                  : prev,
                              )
                              setPendingExtraFiles([])

                              toast({
                                title: "Documentación extra enviada",
                                description: "Se enviaron tus archivos y el texto adicional al proveedor.",
                              })
                            } catch (err) {
                              console.error("Unexpected error sending extra docs payload", err)
                              toast({
                                title: "Error inesperado",
                                description: "Ocurrió un problema al enviar la documentación.",
                                variant: "destructive",
                              })
                            } finally {
                              setUploadingExtraDocs(false)
                            }
                          }}
                        >
                          Enviar documentación extra
                        </Button>
                      </div>

                      {(selected.extraDocsClientText || selected.extraDocsUrls.length > 0) && (
                        <div className="mt-3 space-y-2 border-t pt-2">
                          {selected.extraDocsClientText && (
                            <div className="space-y-1">
                              <p className="font-medium">Texto que enviaste previamente</p>
                              <p className="text-muted-foreground whitespace-pre-line text-xs">
                                {selected.extraDocsClientText}
                              </p>
                            </div>
                          )}
                          {selected.extraDocsUrls.length > 0 && (
                            <div className="space-y-1">
                              <p className="font-medium">Archivos que ya enviaste</p>
                              <div className="flex flex-wrap gap-3">
                                {selected.extraDocsUrls.map((url, idx) => {
                                  const isImage = /\.(jpe?g|png|gif|webp|bmp)$/i.test(url)
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="border rounded-md overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors text-xs text-center text-gray-700 w-32"
                                    >
                                      {isImage ? (
                                        <img src={url} alt={`Documento extra ${idx + 1}`} className="h-24 w-full object-cover" />
                                      ) : (
                                        <div className="h-24 flex items-center justify-center px-2">
                                          <span className="break-words">Ver archivo {idx + 1}</span>
                                        </div>
                                      )}
                                      <div className="px-2 py-1 border-t">Documento {idx + 1}</div>
                                    </a>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(selected.clientFullName || selected.clientDni || selected.clientPhone || selected.clientEmail ||
              selected.clientAddress) && (
              <div className="space-y-1 text-sm border-t pt-3 mt-2">
                <p className="font-medium">Tus datos declarados en la solicitud</p>
                <p className="text-muted-foreground">
                  {selected.clientFullName || "(sin nombre)"}
                  {selected.clientAge != null && ` · ${selected.clientAge} años`}
                </p>
                <p className="text-muted-foreground">
                  {selected.clientDni && <span>DNI: {selected.clientDni}</span>}
                  {selected.clientPhone && (
                    <>
                      {selected.clientDni && " · "}
                      Tel: {selected.clientPhone}
                    </>
                  )}
                </p>
                {selected.clientEmail && (
                  <p className="text-muted-foreground">Email: {selected.clientEmail}</p>
                )}
                {selected.clientAddress && (
                  <p className="text-muted-foreground">Dirección: {selected.clientAddress}</p>
                )}
              </div>
            )}

            {selected.familyMembers.length > 0 && (
              <div className="space-y-2 pt-2 text-sm">
                <p className="font-medium">Integrantes adicionales del grupo familiar</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {selected.familyMembers.map((m, idx) => (
                    <li key={idx}>
                      {m.full_name || "Sin nombre"}
                      {m.age != null && ` · ${m.age} años`}
                      {m.dni && ` · DNI: ${m.dni}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.notes && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Notas que enviaste al proveedor</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.notes}</p>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
