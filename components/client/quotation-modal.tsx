"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

interface QuotationModalProps {
  providerId: string
  serviceId?: string
  serviceName?: string
  isOpen: boolean
  onClose: () => void
}

interface QuotationFormState {
  fullName: string
  phone: string
  email: string
  dni: string
  address: string
  age: string
  peopleCount: string
  notes: string
  contactTime: string
}

export function QuotationModal({ providerId, serviceId, serviceName, isOpen, onClose }: QuotationModalProps) {
  const [formData, setFormData] = useState<QuotationFormState>({
    fullName: "",
    phone: "",
    email: "",
    dni: "",
    address: "",
    age: "",
    peopleCount: "1",
    notes: "",
    contactTime: "",
  })
  const [familyMembers, setFamilyMembers] = useState<{ fullName: string; dni: string; age: string }[]>([])
  const [dniFrontFile, setDniFrontFile] = useState<File | null>(null)
  const [dniBackFile, setDniBackFile] = useState<File | null>(null)
  const [serviceBillingMode, setServiceBillingMode] = useState<"one_time" | "monthly" | "both" | null>(null)
  const [requestedBillingMode, setRequestedBillingMode] = useState<"one_time" | "monthly">("one_time")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen) return

    async function preloadClientData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, dni, province, city, birth_date")
          .eq("id", user.id)
          .single()

        const fullName = profile?.full_name || ""
        const phone = profile?.phone || ""
        const dni = profile?.dni || ""
        const addressParts = [profile?.city, profile?.province].filter(Boolean)
        const address = addressParts.join(", ")

        let age = ""
        if (profile?.birth_date) {
          const birth = new Date(profile.birth_date)
          const today = new Date()
          let years = today.getFullYear() - birth.getFullYear()
          const m = today.getMonth() - birth.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            years--
          }
          age = String(years)
        }

        setFormData((prev) => ({
          ...prev,
          fullName,
          phone,
          email: user.email || "",
          dni,
          address,
          age,
        }))

        if (serviceId) {
          const { data: service } = await supabase
            .from("services")
            .select("max_members, billing_mode")
            .eq("id", Number(serviceId))
            .single()

          if (service && typeof service.max_members === "number") {
            setMaxMembers(service.max_members)
          } else {
            setMaxMembers(null)
          }

          const bm = (service as any)?.billing_mode as string | null
          if (bm === "monthly" || bm === "both" || bm === "one_time") {
            setServiceBillingMode(bm)
            setRequestedBillingMode(bm === "monthly" ? "monthly" : "one_time")
          } else {
            setServiceBillingMode(null)
            setRequestedBillingMode("one_time")
          }
        } else {
          setMaxMembers(null)
          setServiceBillingMode(null)
          setRequestedBillingMode("one_time")
        }
      } catch (e) {
        console.error("Error preloading client profile for quotation modal", e)
      }
    }

    preloadClientData()
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))

    if (e.target.name === "address") {
      const query = e.target.value
      if (!query) {
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
        return
      }

      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[\s,]+/g, "")

      const normQuery = normalize(query)

      const allOptions: string[] = []
      ARGENTINA_PROVINCES.forEach((prov) => {
        allOptions.push(prov)
        const depts = DEPARTMENTS_BY_PROVINCE[prov] || []
        depts.forEach((dept) => {
          allOptions.push(`${dept}, ${prov}`)
        })
      })

      const filtered = allOptions
        .filter((opt) => {
          const normOpt = normalize(opt)
          if (normOpt.includes(normQuery)) return true

          const parts = opt.split(",").map((p) => p.trim())
          if (parts.length === 2) {
            const [a, b] = parts
            const ab = normalize(a + b)
            const ba = normalize(b + a)
            return ab.includes(normQuery) || ba.includes(normQuery)
          }

          return false
        })
        .slice(0, 30)

      setAddressSuggestions(filtered)
      setShowAddressSuggestions(filtered.length > 0)
    }
  }

  // Actualizar cantidad de personas y formularios extra respetando el máximo del plan
  useEffect(() => {
    let count = Math.max(1, Number(formData.peopleCount || "1"))
    if (maxMembers && count > maxMembers) {
      count = maxMembers
      setFormData((prev) => ({ ...prev, peopleCount: String(maxMembers) }))
    }
    const extras = Math.max(0, count - 1)

    setFamilyMembers((prev) => {
      const copy = [...prev]
      if (copy.length > extras) return copy.slice(0, extras)
      while (copy.length < extras) {
        copy.push({ fullName: "", dni: "", age: "" })
      }
      return copy
    })
  }, [formData.peopleCount, maxMembers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación de campos obligatorios
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.dni.trim()) {
      const msg = "Completa nombre, teléfono, correo y DNI para continuar."
      setError(msg)
      toast({ title: "Faltan datos", description: msg, variant: "destructive" })
      return
    }

    if (!formData.address.trim()) {
      const msg = "Completa la dirección para continuar."
      setError(msg)
      toast({ title: "Faltan datos", description: msg, variant: "destructive" })
      return
    }

    if (!formData.age.trim()) {
      const msg = "Indica la edad del solicitante."
      setError(msg)
      toast({ title: "Faltan datos", description: msg, variant: "destructive" })
      return
    }

    const peopleCountNumber = Math.max(1, Number(formData.peopleCount || "1"))
    if (!peopleCountNumber || Number.isNaN(peopleCountNumber)) {
      const msg = "Indica la cantidad de personas del grupo familiar."
      setError(msg)
      toast({ title: "Faltan datos", description: msg, variant: "destructive" })
      return
    }

    if (maxMembers && peopleCountNumber > maxMembers) {
      const msg = `Este plan permite hasta ${maxMembers} integrantes (incluyendo titular).`
      setError(msg)
      toast({ title: "Límite de integrantes", description: msg, variant: "destructive" })
      return
    }

    if (!dniFrontFile || !dniBackFile) {
      const msg = "Debes adjuntar las imágenes de DNI frente y dorso."
      setError(msg)
      toast({ title: "Faltan archivos", description: msg, variant: "destructive" })
      return
    }

    // Validar integrantes adicionales
    for (let i = 0; i < familyMembers.length; i++) {
      const m = familyMembers[i]
      if (!m.fullName.trim() || !m.dni.trim() || !m.age.trim()) {
        const msg = `Completa nombre, DNI y edad del integrante adicional #${i + 2}.`
        setError(msg)
        toast({ title: "Faltan datos del grupo familiar", description: msg, variant: "destructive" })
        return
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Debes iniciar sesión para solicitar una cotización.")
        toast({
          title: "Sesión requerida",
          description: "Debes iniciar sesión para solicitar una cotización.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const userId = user.id

      // 1. Subir imágenes de DNI (si existen)
      let dniFrontUrl: string | null = null
      let dniBackUrl: string | null = null

      const bucket = supabase.storage.from("quotation-files")

      async function uploadIfPresent(file: File | null, side: "front" | "back") {
        if (!file) return null
        const ext = file.name.split(".").pop() || "jpg"
        const path = `dni/${userId}/${side}-${Date.now()}.${ext}`
        const { error: uploadError } = await bucket.upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        })
        if (uploadError) {
          console.error("Error uploading DNI", uploadError)
          throw new Error("No se pudo subir la imagen del DNI. Intenta nuevamente.")
        }
        const { data } = bucket.getPublicUrl(path)
        return data.publicUrl
      }

      dniFrontUrl = await uploadIfPresent(dniFrontFile, "front")
      dniBackUrl = await uploadIfPresent(dniBackFile, "back")

      // 2. Insertar cotización en la base de datos
      const familyMembersPayload = familyMembers.map((m) => ({
        full_name: m.fullName,
        dni: m.dni,
        age: m.age ? Number(m.age) : null,
      }))

      const notesParts: string[] = []
      if (formData.notes.trim()) {
        notesParts.push(formData.notes.trim())
      }
      if (formData.contactTime.trim()) {
        notesParts.push(`Franja horaria sugerida para contacto: ${formData.contactTime.trim()}`)
      }

      const finalNotes = notesParts.length ? notesParts.join("\n\n") : null

      const { error: insertError } = await supabase.from("quotations").insert({
        client_id: user.id,
        provider_id: providerId,
        service_id: serviceId ? Number(serviceId) : null,
        requested_billing_mode: requestedBillingMode,
        requested_for: null,
        notes: finalNotes,
        status: "pending",
        view_status: "sin_observar",
        client_full_name: formData.fullName,
        client_phone: formData.phone,
        client_email: formData.email,
        client_dni: formData.dni,
        client_address: formData.address,
        client_age: formData.age ? Number(formData.age) : null,
        dni_front_url: dniFrontUrl,
        dni_back_url: dniBackUrl,
        family_members: familyMembersPayload.length ? familyMembersPayload : null,
      })

      if (insertError) {
        console.error("Error inserting quotation", insertError)
        setError("No se pudo enviar la solicitud de cotización. Intenta nuevamente.")
        toast({
          title: "No se pudo enviar la solicitud",
          description: "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      toast({ title: "Solicitud enviada", description: "Tu cotización fue enviada al proveedor.", variant: "default" })
      setLoading(false)
      onClose()
    } catch (err) {
      console.error("Unexpected error creating quotation", err)
      setError("Ocurrió un error inesperado al enviar la solicitud.")
      toast({
        title: "Error inesperado",
        description: "Ocurrió un problema al enviar la solicitud. Intenta nuevamente.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-2xl font-bold">Solicitar Cotización</h3>
        {serviceName && (
          <p className="text-sm text-muted-foreground">Plan / servicio seleccionado: {serviceName}</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input name="phone" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Correo electrónico</label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>

            {serviceId && serviceBillingMode === "both" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Tipo de contratación</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={requestedBillingMode}
                  onChange={(e) => setRequestedBillingMode(e.target.value as any)}
                >
                  <option value="one_time">Uso único (pago único)</option>
                  <option value="monthly">Póliza mensual</option>
                </select>
              </div>
            )}

            {serviceId && serviceBillingMode === "monthly" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Tipo de contratación</label>
                <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  Póliza mensual
                </div>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Dirección</label>
              <div className="relative">
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowAddressSuggestions(true)
                  }}
                  onBlur={() => {
                    // pequeño timeout para permitir clic en la opción
                    setTimeout(() => setShowAddressSuggestions(false), 100)
                  }}
                  required
                />
                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-50">
                    {addressSuggestions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setFormData((prev) => ({ ...prev, address: opt }))
                          setShowAddressSuggestions(false)
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad de personas</label>
              <Input
                name="peopleCount"
                type="number"
                min={1}
                value={formData.peopleCount}
                onChange={handleChange}
              />
              {maxMembers && (
                <p className="text-xs text-muted-foreground">
                  Este plan permite hasta {maxMembers} integrantes en total (incluyendo al titular).
                </p>
              )}
            </div>
          </div>

          {familyMembers.length > 0 && (
            <div className="space-y-4 border-t pt-4 mt-2">
              <p className="text-sm font-medium">Integrantes adicionales del grupo familiar</p>
              {familyMembers.map((member, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Nombre completo</label>
                    <Input
                      value={member.fullName}
                      onChange={(e) => {
                        const value = e.target.value
                        setFamilyMembers((prev) => {
                          const copy = [...prev]
                          copy[index] = { ...copy[index], fullName: value }
                          return copy
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">DNI</label>
                    <Input
                      value={member.dni}
                      onChange={(e) => {
                        const value = e.target.value
                        setFamilyMembers((prev) => {
                          const copy = [...prev]
                          copy[index] = { ...copy[index], dni: value }
                          return copy
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Edad</label>
                    <Input
                      type="number"
                      value={member.age}
                      onChange={(e) => {
                        const value = e.target.value
                        setFamilyMembers((prev) => {
                          const copy = [...prev]
                          copy[index] = { ...copy[index], age: value }
                          return copy
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">DNI frente (imagen)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setDniFrontFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">DNI dorso (imagen)</label>
              <Input type="file" accept="image/*" onChange={(e) => setDniBackFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Franja horaria para comunicación</label>
            <Input
              name="contactTime"
              placeholder="Ej: Lunes a viernes de 9 a 13 hs, o después de las 18 hs"
              value={formData.contactTime}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Indique en qué horarios prefiere que el proveedor se comunique para coordinar el plan.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Detalle sus preferencias y necesidades</label>
            <textarea
              name="notes"
              placeholder="Por ejemplo: tipo de servicio deseado, características especiales, límites de presupuesto, etc."
              value={formData.notes}
              onChange={handleChange}
              className="w-full min-h-24 px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Solicitud"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
          <datalist id="address-suggestions">
            {ARGENTINA_PROVINCES.map((prov) => (
              <option key={prov} value={prov} />
            ))}
            {ARGENTINA_PROVINCES.flatMap((prov) => (DEPARTMENTS_BY_PROVINCE[prov] || []).map((dept) => `${dept}, ${prov}`)).map(
              (label) => (
                <option key={label} value={label} />
              ),
            )}
          </datalist>
        </form>
      </Card>
    </div>
  )
}
