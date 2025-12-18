"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Calendar, DollarSign, Eye, FileText, Clock, Trash2 } from "lucide-react"

interface ProviderQuotationItem {
  id: number
  clientFullName: string | null
  clientEmail: string | null
  clientPhone: string | null
  serviceName: string | null
  status: string
  viewStatus?: string | null
  proposedPrice: number | null
  createdAt: string
  notes: string | null
  providerNotes: string | null
  extraDocsRequested: boolean
  extraDocsMessage: string | null
  dniFrontUrl: string | null
  dniBackUrl: string | null
  extraDocsUrls: string[]
  extraDocsClientText: string | null
  paymentEnabled: boolean
  clientDeletedAt: string | null
  rejectedBy: string | null
  handledByEmail: string | null
}

interface ProviderQuotationsProps {
  focusClientRejected?: boolean
}

export function ProviderQuotations({ focusClientRejected = false }: ProviderQuotationsProps) {
  const [items, setItems] = useState<ProviderQuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProviderQuotationItem | null>(null)
  const [priceInput, setPriceInput] = useState<string>("")
  const [providerNotesInput, setProviderNotesInput] = useState<string>("")
  const [extraDocsRequestedInput, setExtraDocsRequestedInput] = useState(false)
  const [extraDocsMessageInput, setExtraDocsMessageInput] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [availableServices, setAvailableServices] = useState<{ id: number; name: string; basePrice: number | null }[]>([])
  const [selectedExistingServiceId, setSelectedExistingServiceId] = useState<string>("")
  const [existingPlanSearch, setExistingPlanSearch] = useState("")
  const [existingPlanFocused, setExistingPlanFocused] = useState(false)
  const [customPlanName, setCustomPlanName] = useState("")
  const [customPlanDescription, setCustomPlanDescription] = useState("")
  const [customMaxMembers, setCustomMaxMembers] = useState("1")
  const [customImages, setCustomImages] = useState<string[]>([])
  const [customPdfs, setCustomPdfs] = useState<string[]>([])
  const [showExistingPlanSection, setShowExistingPlanSection] = useState(false)
  const [showCustomPlanSection, setShowCustomPlanSection] = useState(false)
  const { toast } = useToast()
  const clientRejectedSectionRef = useRef<HTMLDivElement | null>(null)

  const handleEnablePayment = async () => {
    if (!selected) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("quotations")
        .update({ payment_enabled: true })
        .eq("id", selected.id)

      if (error) {
        console.error("Error enabling payment for quotation", error)
        toast({
          title: "No se pudo habilitar el pago",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      setItems((prev) => prev.map((q) => (q.id === selected.id ? { ...q, paymentEnabled: true } : q)))
      setSelected((prev) => (prev ? { ...prev, paymentEnabled: true } : prev))

      toast({
        title: "Pago habilitado",
        description: "El cliente ahora puede abonar esta cotización.",
      })
    } catch (e) {
      console.error("Unexpected error enabling payment", e)
      toast({
        title: "Error inesperado",
        description: "Ocurrió un problema al habilitar el pago.",
        variant: "destructive",
      })
    }
  }

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

      const { data: quotations, error } = await supabase
        .from("quotations")
        .select(
          "id, client_full_name, client_email, client_phone, service_id, status, view_status, proposed_price, created_at, notes, provider_notes, extra_docs_requested, extra_docs_message, extra_docs_client_text, payment_enabled, client_deleted_at, rejected_by, dni_front_url, dni_back_url, extra_docs_urls, handled_by_email",
        )
        .eq("provider_id", effectiveProviderId)
        .is("provider_deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching provider quotations", error)
        setItems([])
        setLoading(false)
        return
      }

      const quotationsSafe = quotations || []

      const serviceIds = Array.from(new Set(quotationsSafe.map((q) => q.service_id).filter(Boolean))) as number[]

      const { data: services } = serviceIds.length
        ? await supabase
            .from("services")
            .select("id, name")
            .in("id", serviceIds)
        : { data: [] as any[] }

      // Servicios públicos del proveedor para poder "enviar otro plan"
      const { data: providerServices } = await supabase
        .from("services")
        .select("id, name, base_price")
        .eq("provider_id", effectiveProviderId)
        .eq("is_public", true)

      setAvailableServices(
        (providerServices || []).map((s: any) => ({
          id: s.id as number,
          name: (s.name as string) || "",
          basePrice: s.base_price != null ? Number(s.base_price) : null,
        })),
      )

      const mapped: ProviderQuotationItem[] = quotationsSafe.map((q: any) => {
        const service = services?.find((s: any) => s.id === q.service_id)
        const extraDocsRequested = (q.extra_docs_requested as boolean | null) ?? false
        const rawPaymentEnabled = q.payment_enabled as boolean | null

        return {
          id: q.id as number,
          clientFullName: (q.client_full_name as string) || null,
          clientEmail: (q.client_email as string) || null,
          clientPhone: (q.client_phone as string) || null,
          serviceName: service?.name || null,
          status: q.status as string,
          viewStatus: (q.view_status as string | null) ?? null,
          proposedPrice: q.proposed_price != null ? Number(q.proposed_price) : null,
          createdAt: q.created_at as string,
          notes: (q.notes as string | null) || null,
          providerNotes: (q.provider_notes as string | null) || null,
          extraDocsRequested,
          extraDocsMessage: (q.extra_docs_message as string | null) || null,
          dniFrontUrl: (q.dni_front_url as string | null) || null,
          dniBackUrl: (q.dni_back_url as string | null) || null,
          extraDocsUrls: (q.extra_docs_urls as string[] | null) || [],
          extraDocsClientText: (q.extra_docs_client_text as string | null) || null,
          paymentEnabled:
            rawPaymentEnabled != null
              ? rawPaymentEnabled
              : // Si no hay valor guardado, asumimos habilitado solo cuando no se pidieron documentos extra
                !extraDocsRequested,
          clientDeletedAt: (q.client_deleted_at as string | null) || null,
          rejectedBy: (q.rejected_by as string | null) || null,
          handledByEmail: (q.handled_by_email as string | null) || null,
        }
      })

      setItems(mapped)
      setLoading(false)
    }

    loadQuotations()
  }, [])

  useEffect(() => {
    if (focusClientRejected && clientRejectedSectionRef.current) {
      clientRejectedSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [focusClientRejected])

  const normalize = (value: string | null | undefined) => (value || "").toLowerCase().trim()

  const filteredItems: ProviderQuotationItem[] = items.filter((item: ProviderQuotationItem) => {
    const term = searchTerm.toLowerCase().trim()

    if (term) {
      const inClient = normalize(item.clientFullName).includes(term)
      const inService = normalize(item.serviceName).includes(term)
      if (!inClient && !inService) return false
    }

    if (filterDate) {
      const createdDate = new Date(item.createdAt).toISOString().slice(0, 10)
      if (createdDate !== filterDate) return false
    }

    return true
  })

  const activeItems = filteredItems.filter((item) => item.status !== "rejected" && !item.clientDeletedAt)

  const clientRejectedItems = items.filter(
    (item) => item.status === "rejected" && item.rejectedBy === "client",
  )

  const allRejectedItems = items.filter((item) => item.status === "rejected")

  const filteredAvailableServices = availableServices.filter((svc) => {
    const term = existingPlanSearch.toLowerCase().trim()
    if (!term) return true

    const words = term.split(/\s+/).filter(Boolean)
    const nameNormalized = (svc.name || "").toLowerCase()

    return words.every((w) => nameNormalized.includes(w))
  })

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "accepted":
        return "Enviada al cliente"
      case "rejected":
        return "Rechazada por el proveedor"
      case "expired":
        return "Vencida"
      default:
        return status
    }
  }

  const handleCustomFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "images" | "pdfs",
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "bin"
        const unique = Math.random().toString(36).slice(2)
        const path = `services/${user.id}/custom-${fileType}/${Date.now()}_${unique}.${ext}`

        const { error: uploadError } = await supabase.storage.from("service-files").upload(path, file)
        if (uploadError) {
          console.error("Error uploading custom plan file:", uploadError)
          continue
        }

        const { data } = supabase.storage.from("service-files").getPublicUrl(path)
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl)
        }
      }

      if (uploadedUrls.length > 0) {
        if (fileType === "images") {
          setCustomImages((prev) => [...prev, ...uploadedUrls])
        } else {
          setCustomPdfs((prev) => [...prev, ...uploadedUrls])
        }
      }
    } catch (e) {
      console.error("Unexpected error uploading custom plan files:", e)
      toast({
        title: "Error al subir archivos",
        description: "Ocurrió un problema al subir los archivos del plan personalizado.",
        variant: "destructive",
      })
    }
  }

  const statusClasses = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-emerald-100 text-emerald-700"
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

  const viewBadge = (viewStatus?: string | null) => {
    if (!viewStatus || viewStatus === "sin_observar") {
      return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1"><Eye className="w-3 h-3" /> Nueva</span>
    }
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 flex items-center gap-1"><Eye className="w-3 h-3" /> Vista</span>
  }

  const openDetail = async (item: ProviderQuotationItem) => {
    setSelected(item)
    setPriceInput(item.proposedPrice != null ? String(item.proposedPrice) : "")
    setProviderNotesInput(item.providerNotes || "")
    setExtraDocsRequestedInput(item.extraDocsRequested)
    setExtraDocsMessageInput(item.extraDocsMessage || "")

    if (!item.viewStatus || item.viewStatus === "sin_observar") {
      const supabase = createClient()
      const { error } = await supabase.from("quotations").update({ view_status: "vista" }).eq("id", item.id)
      if (error) {
        console.error("Error marking quotation as viewed", error)
      } else {
        setItems((prev) => prev.map((q) => (q.id === item.id ? { ...q, viewStatus: "vista" } : q)))
      }
    }
  }

  const handleSendExistingPlan = async () => {
    if (!selected) return
    const serviceId = selectedExistingServiceId ? Number(selectedExistingServiceId) : null
    if (!serviceId || Number.isNaN(serviceId)) {
      toast({
        title: "Selecciona un plan",
        description: "Debes elegir un plan existente para enviarlo al cliente.",
        variant: "destructive",
      })
      return
    }

    // Si está abierta la sección de "Enviar otro plan" pero no se eligió ninguno,
    // mostramos un mensaje claro antes de validar precio.
    if (showExistingPlanSection && !selectedExistingServiceId) {
      toast({
        title: "Selecciona un plan",
        description: "Elegí un plan del catálogo para poder enviar la propuesta.",
        variant: "destructive",
      })
      return
    }

    const numericPrice = priceInput.trim() ? Number(priceInput) : null
    if (numericPrice == null || Number.isNaN(numericPrice) || numericPrice <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un importe válido para la cotización.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const handledByEmail = user?.email || null

      const { error } = await supabase
        .from("quotations")
        .update({
          service_id: serviceId,
          proposed_price: numericPrice,
          provider_notes: providerNotesInput || null,
          extra_docs_requested: extraDocsRequestedInput,
          extra_docs_message: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
          payment_enabled: !extraDocsRequestedInput,
          handled_by_email: handledByEmail,
          status: "accepted",
        })
        .eq("id", selected.id)

      if (error) {
        console.error("Error sending existing plan for quotation", error)
        toast({
          title: "No se pudo enviar el plan",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
      } else {
        const chosen = availableServices.find((s) => s.id === serviceId)
        setItems((prev) =>
          prev.map((q) =>
            q.id === selected.id
              ? {
                  ...q,
                  serviceName: chosen?.name || q.serviceName,
                  proposedPrice: numericPrice,
                  providerNotes: providerNotesInput || null,
                  extraDocsRequested: extraDocsRequestedInput,
                  extraDocsMessage: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
                  paymentEnabled: !extraDocsRequestedInput,
                  handledByEmail,
                  status: "accepted",
                }
              : q,
          ),
        )
        setSelected(null)
        setPriceInput("")
        setProviderNotesInput("")
        setExtraDocsRequestedInput(false)
        setExtraDocsMessageInput("")
        setSelectedExistingServiceId("")
        toast({
          title: "Plan enviado",
          description: "Se envió otro plan al cliente para esta cotización.",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCustomPlan = async () => {
    if (!selected) return

    const name = customPlanName.trim()
    if (!name) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa un nombre para el plan personalizado.",
        variant: "destructive",
      })
      return
    }

    const numericPrice = priceInput.trim() ? Number(priceInput) : null
    if (numericPrice == null || Number.isNaN(numericPrice) || numericPrice <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un importe válido para la cotización.",
        variant: "destructive",
      })
      return
    }

    const maxMembersNumber = customMaxMembers ? Number(customMaxMembers) : 1

    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Sesión requerida",
          description: "Debes iniciar sesión como proveedor para crear un plan personalizado.",
          variant: "destructive",
        })
        return
      }

      const { data: service, error: serviceError } = await supabase
        .from("services")
        .insert({
          provider_id: user.id,
          name,
          description: customPlanDescription || null,
          base_price: numericPrice,
          is_active: true,
          is_public: false,
          max_members: maxMembersNumber > 0 ? maxMembersNumber : 1,
          service_areas: [],
          image_urls: customImages,
          video_urls: [],
          pdf_urls: customPdfs,
        })
        .select("id, name")
        .single()

      if (serviceError || !service) {
        console.error("Error creating custom plan", serviceError)
        toast({
          title: "No se pudo crear el plan personalizado",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        return
      }

      const { error: quotationError } = await supabase
        .from("quotations")
        .update({
          service_id: service.id,
          proposed_price: numericPrice,
          provider_notes: providerNotesInput || null,
          extra_docs_requested: extraDocsRequestedInput,
          extra_docs_message: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
          payment_enabled: !extraDocsRequestedInput,
          handled_by_email: handledByEmail,
          status: "accepted",
        })
        .eq("id", selected.id)

      if (quotationError) {
        console.error("Error linking custom plan to quotation", quotationError)
        toast({
          title: "Plan creado pero no vinculado",
          description: "Se creó el plan personalizado pero hubo un problema al vincularlo a la cotización.",
          variant: "destructive",
        })
        return
      }

      setItems((prev) =>
        prev.map((q) =>
          q.id === selected.id
            ? {
                ...q,
                serviceName: service.name,
                proposedPrice: numericPrice,
                providerNotes: providerNotesInput || null,
                extraDocsRequested: extraDocsRequestedInput,
                extraDocsMessage: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
                paymentEnabled: !extraDocsRequestedInput,
                handledByEmail,
                status: "accepted",
              }
            : q,
        ),
      )

      setSelected(null)
      setPriceInput("")
      setProviderNotesInput("")
      setExtraDocsRequestedInput(false)
      setExtraDocsMessageInput("")
      setCustomPlanName("")
      setCustomPlanDescription("")
      setCustomMaxMembers("1")
      setCustomImages([])
      setCustomPdfs([])
      setShowCustomPlanSection(false)

      toast({
        title: "Plan personalizado enviado",
        description: "Se creó y envió un plan personalizado al cliente.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProposal = async () => {
    if (!selected) return

    const numericPrice = priceInput.trim() ? Number(priceInput) : null
    if (numericPrice == null || Number.isNaN(numericPrice) || numericPrice <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un importe válido para la cotización.",
        variant: "destructive",
      })
      return
    }

    // Si el proveedor eligió enviar otro plan existente, usamos esa ruta
    if (showExistingPlanSection && selectedExistingServiceId) {
      await handleSendExistingPlan()
      return
    }

    // Si eligió crear un plan personalizado, usamos esa ruta
    if (showCustomPlanSection) {
      await handleCreateCustomPlan()
      return
    }

    // Caso base: propuesta sobre el plan actual original
    setSaving(true)
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const handledByEmail = user?.email || null
      const { error } = await supabase
        .from("quotations")
        .update({
          proposed_price: numericPrice,
          provider_notes: providerNotesInput || null,
          extra_docs_requested: extraDocsRequestedInput,
          extra_docs_message: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
          payment_enabled: !extraDocsRequestedInput,
          handled_by_email: handledByEmail,
          status: "accepted",
        })
        .eq("id", selected.id)

      if (error) {
        console.error("Error updating quotation proposal", error)
        toast({
          title: "No se pudo guardar la propuesta",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
      } else {
        setItems((prev) =>
          prev.map((q) =>
            q.id === selected.id
              ? {
                  ...q,
                  proposedPrice: numericPrice,
                  providerNotes: providerNotesInput || null,
                  extraDocsRequested: extraDocsRequestedInput,
                  extraDocsMessage: extraDocsRequestedInput ? extraDocsMessageInput || null : null,
                  handledByEmail,
                  status: "accepted",
                }
              : q,
          ),
        )
        setSelected(null)
        setPriceInput("")
        setProviderNotesInput("")
        setExtraDocsRequestedInput(false)
        setExtraDocsMessageInput("")
        toast({
          title: "Propuesta enviada",
          description: "La cotización fue enviada al cliente.",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">
        {focusClientRejected ? "Cotizaciones rechazadas" : "Cotizaciones Recibidas"}
      </h2>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Buscar por cliente o plan</label>
          <Input
            placeholder="Ej: nombre del cliente o nombre del plan"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div ref={clientRejectedSectionRef} className="mt-8 space-y-3">
          <label className="text-sm font-medium">Filtrar por fecha de solicitud</label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
      </div>

      {loading && <p>Cargando cotizaciones...</p>}

      {/* Vista normal (pestaña Cotizaciones) */}
      {!loading && !focusClientRejected && activeItems.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aún no has recibido solicitudes de cotización.</p>
        </Card>
      )}

      {!loading && !focusClientRejected && activeItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeItems.map((q) => (
            <Card key={q.id} className="p-6 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-lg">{q.clientFullName || "Cliente sin nombre"}</h3>
                  {q.serviceName && (
                    <p className="text-sm text-muted-foreground">Plan: {q.serviceName}</p>
                  )}
                  {q.handledByEmail && (
                    <p className="text-xs text-muted-foreground">Atendido por: {q.handledByEmail}</p>
                  )}
                  {q.clientEmail && <p className="text-xs text-muted-foreground">{q.clientEmail}</p>}
                  {q.clientPhone && <p className="text-xs text-muted-foreground">Tel: {q.clientPhone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(q.status)}`}>
                    {q.status === "rejected" && q.rejectedBy === "client"
                      ? "Rechazada por el cliente"
                      : statusLabel(q.status)}
                  </span>
                  {viewBadge(q.viewStatus)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Recibida el {new Date(q.createdAt).toLocaleDateString("es-AR")}</span>
              </div>

              {q.proposedPrice != null && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                  <span>Propuesta actual: ${q.proposedPrice}</span>
                </div>
              )}

              {q.notes && (
                <div className="text-xs text-muted-foreground flex items-start gap-1">
                  <FileText className="w-3 h-3 mt-0.5" />
                  <p className="line-clamp-2">Notas del cliente: {q.notes}</p>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <Button
                  size="icon"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8"
                  aria-label="Eliminar cotización"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "¿Seguro que deseas eliminar definitivamente esta cotización? El cliente dejará de verla.",
                    )
                    if (!confirmed) return

                    const supabase = createClient()
                    const {
                      data: { user },
                    } = await supabase.auth.getUser()

                    if (!user) {
                      toast({
                        title: "Sesión requerida",
                        description: "Debes iniciar sesión como proveedor para eliminar una cotización.",
                        variant: "destructive",
                      })
                      return
                    }

                    const { error } = await supabase
                      .from("quotations")
                      .delete()
                      .eq("id", q.id)

                    if (error) {
                      console.error("Error deleting quotation by provider", error)
                      toast({
                        title: "No se pudo eliminar la cotización",
                        description: "Intenta nuevamente en unos minutos.",
                        variant: "destructive",
                      })
                      return
                    }

                    setItems((prev) => prev.filter((x) => x.id !== q.id))
                    toast({
                      title: "Cotización eliminada",
                      description: "La cotización fue eliminada correctamente.",
                    })
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDetail(q)}>
                  Ver detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sección de cotizaciones rechazadas por el cliente eliminada de la vista normal;
          ahora se gestiona exclusivamente desde la pestaña "Cotizaciones rechazadas". */}

      {/* Vista de rechazadas (pestaña Cotizaciones rechazadas) */}
      {!loading && focusClientRejected && allRejectedItems.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aún no tienes cotizaciones rechazadas.</p>
        </Card>
      )}

      {!loading && focusClientRejected && allRejectedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allRejectedItems.map((q) => (
            <Card key={q.id} className="p-6 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-lg">{q.clientFullName || "Cliente sin nombre"}</h3>
                  {q.serviceName && (
                    <p className="text-sm text-muted-foreground">Plan: {q.serviceName}</p>
                  )}
                  {q.clientEmail && <p className="text-xs text-muted-foreground">{q.clientEmail}</p>}
                  {q.clientPhone && <p className="text-xs text-muted-foreground">Tel: {q.clientPhone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(q.status)}`}>
                    {q.rejectedBy === "client"
                      ? "Rechazada por el cliente"
                      : q.rejectedBy === "provider"
                        ? "Rechazada por ti"
                        : statusLabel(q.status)}
                  </span>
                  {viewBadge(q.viewStatus)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Recibida el {new Date(q.createdAt).toLocaleDateString("es-AR")}</span>
              </div>

              {q.proposedPrice != null && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                  <span>Propuesta actual: ${q.proposedPrice}</span>
                </div>
              )}

              {q.notes && (
                <div className="text-xs text-muted-foreground flex items-start gap-1">
                  <FileText className="w-3 h-3 mt-0.5" />
                  <p className="line-clamp-2">Notas del cliente: {q.notes}</p>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <Button
                  size="icon"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8"
                  aria-label="Eliminar cotización"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "¿Seguro que deseas eliminar definitivamente esta cotización? El cliente dejará de verla.",
                    )
                    if (!confirmed) return

                    const supabase = createClient()
                    const {
                      data: { user },
                    } = await supabase.auth.getUser()

                    if (!user) {
                      toast({
                        title: "Sesión requerida",
                        description: "Debes iniciar sesión como proveedor para eliminar una cotización.",
                        variant: "destructive",
                      })
                      return
                    }

                    const { error } = await supabase
                      .from("quotations")
                      .delete()
                      .eq("id", q.id)

                    if (error) {
                      console.error("Error deleting quotation by provider", error)
                      toast({
                        title: "No se pudo eliminar la cotización",
                        description: "Intenta nuevamente en unos minutos.",
                        variant: "destructive",
                      })
                      return
                    }

                    setItems((prev) => prev.filter((x) => x.id !== q.id))
                    toast({
                      title: "Cotización eliminada",
                      description: "La cotización fue eliminada correctamente.",
                    })
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDetail(q)}>
                  Ver detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 space-y-4 bg-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">Detalle de la solicitud</h3>
                <p className="text-sm text-muted-foreground">
                  Cliente: {selected.clientFullName || selected.clientEmail || "Sin nombre"}
                </p>
                {selected.serviceName && (
                  <p className="text-sm text-muted-foreground">Plan: {selected.serviceName}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(selected.status)}`}>
                  {statusLabel(selected.status)}
                </span>
                {viewBadge(selected.viewStatus)}
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Fecha de solicitud: </span>
                {new Date(selected.createdAt).toLocaleDateString("es-AR")}
              </p>
              {selected.clientEmail && (
                <p>
                  <span className="font-medium">Email: </span>
                  {selected.clientEmail}
                </p>
              )}
              {selected.clientPhone && (
                <p>
                  <span className="font-medium">Teléfono: </span>
                  {selected.clientPhone}
                </p>
              )}
              {selected.handledByEmail && (
                <p>
                  <span className="font-medium">Atendido por: </span>
                  {selected.handledByEmail}
                </p>
              )}
            </div>

            {(selected.dniFrontUrl || selected.dniBackUrl || (selected.extraDocsUrls && selected.extraDocsUrls.length > 0)) && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-medium">Documentación del cliente</p>
                <div className="flex flex-wrap gap-3">
                  {selected.dniFrontUrl && (
                    <a
                      href={selected.dniFrontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-md overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={selected.dniFrontUrl}
                        alt="DNI frente del cliente"
                        className="h-28 w-44 object-cover"
                      />
                      <div className="px-2 py-1 text-xs text-center text-gray-600">DNI - Frente</div>
                    </a>
                  )}
                  {selected.dniBackUrl && (
                    <a
                      href={selected.dniBackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-md overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={selected.dniBackUrl}
                        alt="DNI dorso del cliente"
                        className="h-28 w-44 object-cover"
                      />
                      <div className="px-2 py-1 text-xs text-center text-gray-600">DNI - Dorso</div>
                    </a>
                  )}
                  {selected.extraDocsUrls &&
                    selected.extraDocsUrls.map((url, idx) => {
                      const isImage = /\.(jpe?g|png|gif|webp|bmp)$/i.test(url)
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border rounded-md overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          {isImage ? (
                            <img
                              src={url}
                              alt={`Documento extra ${idx + 1}`}
                              className="h-28 w-44 object-cover"
                            />
                          ) : (
                            <div className="h-28 w-44 flex items-center justify-center px-2 text-xs text-gray-700">
                              Ver archivo {idx + 1}
                            </div>
                          )}
                          <div className="px-2 py-1 text-xs text-center text-gray-600">Doc. extra {idx + 1}</div>
                        </a>
                      )
                    })}
                  {selected.extraDocsClientText && (
                    <div className="w-full mt-2 text-xs text-gray-700 border-t pt-2">
                      <p className="font-medium text-xs mb-1">Información adicional enviada por el cliente</p>
                      <p className="whitespace-pre-line text-gray-700">{selected.extraDocsClientText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">Notas del cliente</p>
                <p className="text-muted-foreground whitespace-pre-line">{selected.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Importe de la cotización (ARS)</label>
                <Input
                  type="number"
                  min={0}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Ej: 15000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas o condiciones para el cliente</label>
                <textarea
                  className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm"
                  value={providerNotesInput}
                  onChange={(e) => setProviderNotesInput(e.target.value)}
                  placeholder="Detalles de la propuesta, condiciones, formas de pago, etc."
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4 mt-2 text-sm">
              <p className="font-medium">Opciones de plan para esta solicitud</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowExistingPlanSection((prev) => !prev)
                    setShowCustomPlanSection(false)
                  }}
                  disabled={saving}
                >
                  Enviar otro plan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomPlanSection((prev) => !prev)
                    setShowExistingPlanSection(false)
                  }}
                  disabled={saving}
                >
                  Crear plan personalizado
                </Button>
              </div>

              {showExistingPlanSection && (
                <div className="mt-3 space-y-2 border rounded-md p-3 bg-gray-50">
                  <label className="font-medium">Enviar otro plan existente</label>
                  <Input
                    placeholder="Selecciona o busca un plan del catálogo..."
                    value={
                      existingPlanSearch ||
                      availableServices.find((s) => String(s.id) === selectedExistingServiceId)?.name ||
                      ""
                    }
                    onChange={(e) => {
                      setExistingPlanSearch(e.target.value)
                      setSelectedExistingServiceId("")
                    }}
                    onFocus={() => setExistingPlanFocused(true)}
                    onBlur={() => {
                      // pequeño retraso para permitir clic en una opción
                      setTimeout(() => setExistingPlanFocused(false), 100)
                    }}
                    className="text-sm"
                  />
                  {existingPlanFocused && filteredAvailableServices.length > 0 && (
                    <div className="max-h-40 overflow-auto border rounded-md bg-white text-sm">
                      {filteredAvailableServices.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                            String(svc.id) === selectedExistingServiceId ? "bg-gray-100 font-medium" : ""
                          }`}
                          onClick={() => {
                            setSelectedExistingServiceId(String(svc.id))
                            // Si el plan tiene un precio base y el campo de precio está vacío,
                            // lo usamos como valor por defecto para que sea más cómodo.
                            if ((!priceInput || Number(priceInput) <= 0) && svc.basePrice != null) {
                              setPriceInput(String(svc.basePrice))
                            }
                            setExistingPlanSearch("")
                            setExistingPlanFocused(false)
                          }}
                        >
                          {svc.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Este plan reemplazará al plan original de la solicitud para este cliente.
                  </p>
                </div>
              )}

              {showCustomPlanSection && (
                <div className="mt-3 space-y-3 border rounded-md p-3 bg-gray-50">
                  <p className="font-medium">Crear plan personalizado</p>
                  <Input
                    placeholder="Nombre del plan personalizado"
                    value={customPlanName}
                    onChange={(e) => setCustomPlanName(e.target.value)}
                  />
                  <textarea
                    className="w-full min-h-[70px] border rounded-md px-3 py-2 text-sm bg-white"
                    placeholder="Descripción del plan personalizado (opcional)"
                    value={customPlanDescription}
                    onChange={(e) => setCustomPlanDescription(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium w-40">Máx. integrantes (incluye titular)</label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={customMaxMembers}
                      onChange={(e) => setCustomMaxMembers(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="font-medium">Imágenes opcionales del plan</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="w-full text-xs"
                      onChange={(e) => handleCustomFileUpload(e, "images")}
                    />
                    {customImages.length > 0 && (
                      <p className="text-muted-foreground">{customImages.length} imagen(es) agregada(s).</p>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="font-medium">PDF opcionales (detalles, términos, etc.)</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      className="w-full text-xs"
                      onChange={(e) => handleCustomFileUpload(e, "pdfs")}
                    />
                    {customPdfs.length > 0 && (
                      <p className="text-muted-foreground">{customPdfs.length} PDF(s) agregado(s).</p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={handleCreateCustomPlan}
                    disabled={saving}
                  >
                    Crear y enviar plan personalizado
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-4 mt-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={extraDocsRequestedInput}
                  onChange={(e) => setExtraDocsRequestedInput(e.target.checked)}
                />
                <span className="font-medium">Solicitar documentación extra al cliente</span>
              </label>
              {extraDocsRequestedInput && (
                <textarea
                  className="w-full min-h-[70px] border rounded-md px-3 py-2 text-sm"
                  value={extraDocsMessageInput}
                  onChange={(e) => setExtraDocsMessageInput(e.target.value)}
                  placeholder="Describe qué documentación o datos adicionales necesitas (imágenes, PDFs, texto, etc.)."
                />
              )}
              {selected?.extraDocsRequested && (
                <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Estado de pago para el cliente: {selected.paymentEnabled ? "Habilitado" : "Bloqueado"}
                  </span>
                  {!selected.paymentEnabled && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={saving}
                      onClick={handleEnablePayment}
                    >
                      Habilitar pago al cliente
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                disabled={saving || !selected}
                onClick={async () => {
                  if (!selected) return
                  const confirmed = window.confirm(
                    "¿Seguro que deseas rechazar esta cotización? El cliente verá que fue rechazada.",
                  )
                  if (!confirmed) return

                  const supabase = createClient()
                  const { error } = await supabase
                    .from("quotations")
                    .update({ status: "rejected" })
                    .eq("id", selected.id)

                  if (error) {
                    console.error("Error rejecting quotation by provider", error)
                    toast({
                      title: "No se pudo rechazar la cotización",
                      description: "Intenta nuevamente en unos minutos.",
                      variant: "destructive",
                    })
                    return
                  }

                  setItems((prev) => prev.map((q) => (q.id === selected.id ? { ...q, status: "rejected" } : q)))
                  setSelected(null)
                  toast({
                    title: "Cotización rechazada",
                    description: "El cliente verá que la propuesta fue rechazada.",
                  })
                }}
              >
                Rechazar
              </Button>
              {selected?.status === "rejected" && (
                <Button
                  variant="outline"
                  className="border-red-500 text-red-700 hover:bg-red-50"
                  disabled={saving || !selected}
                  onClick={async () => {
                    if (!selected) return
                    const confirmed = window.confirm(
                      "¿Seguro que deseas eliminar esta cotización? El cliente dejará de verla.",
                    )
                    if (!confirmed) return

                    const supabase = createClient()
                    const { error } = await supabase.from("quotations").delete().eq("id", selected.id)

                    if (error) {
                      console.error("Error deleting quotation by provider", error)
                      toast({
                        title: "No se pudo eliminar la cotización",
                        description: "Intenta nuevamente en unos minutos.",
                        variant: "destructive",
                      })
                      return
                    }

                    setItems((prev) => prev.filter((q) => q.id !== selected.id))
                    setSelected(null)
                    toast({
                      title: "Cotización eliminada",
                      description: "La cotización fue eliminada correctamente.",
                    })
                  }}
                >
                  Eliminar
                </Button>
              )}
              {selected?.status === "pending" && (
                <Button
                  onClick={handleSaveProposal}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? "Guardando..." : "Enviar propuesta"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
