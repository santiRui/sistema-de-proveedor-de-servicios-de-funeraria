"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProviderStore } from "@/lib/store/provider-store"
import { getProviderProfile } from "@/app/provider/actions"
import { createClient } from "@/lib/supabase/client"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { summarizeServiceAreas } from "@/lib/utils"
import { Plus, Trash2, Edit2, X, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ServiceManagement() {
  const { services, addService, removeService, updateService, setServices } = useProviderStore()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [serviceAreas, setServiceAreas] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billingMode: "one_time" as "one_time" | "monthly" | "both",
    areas: [] as string[],
    images: [] as string[],
    videos: [] as string[],
    pdfs: [] as string[],
    maxMembers: "1",
  })

  const [newArea, setNewArea] = useState("")
  const [areasHistory, setAreasHistory] = useState<string[][]>([])

  const formatAreas = (areas: string[]) => {
    const summarized = summarizeServiceAreas(areas)
    const max = 6
    if (summarized.length <= max) return summarized.join(", ")
    return `${summarized.slice(0, max).join(", ")} y ${summarized.length - max} más`
  }

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[:]/g, " ")
      .toLowerCase()
      .trim()

  const matchesAreaQuery = (areaOption: string, query: string) => {
    const qTokens = normalizeText(query).split(/\s+/).filter(Boolean)
    if (qTokens.length === 0) return true
    const candidate = normalizeText(areaOption)
    return qTokens.every((t) => candidate.includes(t))
  }

  const allCoverageOptions: string[] = ARGENTINA_PROVINCES.flatMap((province) => {
    const depts = DEPARTMENTS_BY_PROVINCE[province] || []
    return depts.map((dept) => `${province}: ${dept}`)
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          setRole((user.user_metadata as any)?.role || null)
        }

        const data = await getProviderProfile()
        if (data) {
          setIsVerified(!!data.verified)
          setServiceAreas(data.service_areas || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    async function loadServices() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from("services")
          .select(
            "id, name, description, base_price, billing_mode, service_areas, image_urls, video_urls, pdf_urls, max_members, is_public",
          )
          .eq("provider_id", user.id)
          .eq("is_public", true)

        if (error) {
          console.error("Error fetching services for provider dashboard:", error)
          return
        }

        const mapped = (data || []).map((svc: any) => ({
          id: String(svc.id),
          name: svc.name || "",
          description: svc.description || "",
          price: svc.base_price != null ? String(svc.base_price) : "",
          billingMode: (svc.billing_mode as any) || "one_time",
          areas: (svc.service_areas as string[] | null) || serviceAreas,
          images: (svc.image_urls as string[] | null) || [],
          videos: (svc.video_urls as string[] | null) || [],
          pdfs: (svc.pdf_urls as string[] | null) || [],
          maxMembers: svc.max_members ?? 1,
        }))

        setServices(mapped)
      } catch (e) {
        console.error("Unexpected error loading provider services:", e)
      }
    }

    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setServices])

  const updateAreas = (nextAreas: string[]) => {
    setFormData((prev) => {
      setAreasHistory((hPrev) => {
        const next = [...hPrev, prev.areas]
        return next.length > 30 ? next.slice(next.length - 30) : next
      })
      return {
        ...prev,
        areas: nextAreas,
      }
    })
  }

  const undoAreas = () => {
    setAreasHistory((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop()
      if (last) {
        setFormData((curr) => ({
          ...curr,
          areas: last,
        }))
      }
      return next
    })
  }

  const clearAreas = () => {
    updateAreas([])
  }

  const toggleArea = (area: string) => {
    const nextAreas = formData.areas.includes(area)
      ? formData.areas.filter((a) => a !== area)
      : [...formData.areas, area]
    updateAreas(nextAreas)
  }

  const handleAddCustomArea = () => {
    const value = newArea.trim()
    if (!value) return
    if (!formData.areas.includes(value)) {
      updateAreas([...formData.areas, value])
    }
    setNewArea("")
  }

  const handleRemoveArea = (area: string) => {
    updateAreas(formData.areas.filter((a) => a !== area))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleBillingModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      billingMode: e.target.value as any,
    }))
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "images" | "videos" | "pdfs"
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
        const path = `services/${user.id}/${fileType}/${Date.now()}_${unique}.${ext}`

        const { error: uploadError } = await supabase.storage.from("service-files").upload(path, file)
        if (uploadError) {
          console.error("Error uploading file to storage:", uploadError)
          continue
        }

        const { data } = supabase.storage.from("service-files").getPublicUrl(path)
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl)
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          [fileType]: [...prev[fileType], ...uploadedUrls],
        }))
      }
    } catch (e) {
      console.error("Unexpected error uploading files:", e)
    }
  }

  const removeFile = (fileType: "images" | "videos" | "pdfs", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [fileType]: prev[fileType].filter((_, i) => i !== index),
    }))
  }

  const makeCoverImage = (index: number) => {
    setFormData((prev) => {
      if (index <= 0 || index >= prev.images.length) return prev
      const nextImages = [...prev.images]
      const [picked] = nextImages.splice(index, 1)
      nextImages.unshift(picked)
      return { ...prev, images: nextImages }
    })
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este plan/servicio? Esta acción no se puede deshacer.")
      if (!confirmed) return

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { count: quotationsCount } = await supabase
        .from("quotations")
        .select("id", { head: true, count: "exact" })
        .eq("service_id", serviceId)
        .eq("provider_id", user.id)

      const { count: ordersCount } = await supabase
        .from("orders")
        .select("id", { head: true, count: "exact" })
        .eq("service_id", serviceId)
        .eq("provider_id", user.id)

      const hasDependencies = (quotationsCount || 0) > 0 || (ordersCount || 0) > 0
      if (hasDependencies) {
        const { error: disableError } = await supabase
          .from("services")
          .update({ is_public: false, is_active: false })
          .eq("id", serviceId)
          .eq("provider_id", user.id)

        if (disableError) {
          console.error("Error disabling service with dependencies:", disableError)
          toast({
            title: "No se pudo eliminar el servicio",
            description:
              "Este plan tiene cotizaciones/órdenes asociadas y no se puede borrar. Tampoco se pudo desactivar. Intenta nuevamente más tarde.",
            variant: "destructive",
          })
          return
        }

        removeService(serviceId)
        toast({
          title: "Plan desactivado",
          description:
            "Este plan tenía cotizaciones/órdenes asociadas, por eso no se pudo eliminar. Se desactivó y dejó de ser público.",
        })
        return
      }

      const { error } = await supabase
        .from("services")
        .delete()
        .select("id")
        .eq("id", serviceId)
        .eq("provider_id", user.id)

      if (error) {
        console.error("Error deleting service:", error)
        toast({
          title: "No se pudo eliminar el servicio",
          description:
            (error as any)?.message ||
            (error as any)?.details ||
            (error as any)?.hint ||
            JSON.stringify(error) ||
            "Intenta nuevamente más tarde.",
          variant: "destructive",
        })
        return
      }

      removeService(serviceId)
      toast({
        title: "Servicio eliminado",
        description: "El plan se eliminó correctamente.",
      })
    } catch (e) {
      console.error("Unexpected error deleting service:", e)
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al eliminar el servicio.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isVerified) {
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const base_price = formData.price ? Number(formData.price) : null
      const max_members = formData.maxMembers ? Number(formData.maxMembers) : 1

      if (editingId) {
        const { error } = await supabase
          .from("services")
          .update({
            name: formData.name,
            description: formData.description,
            base_price,
            billing_mode: formData.billingMode,
            max_members,
            service_areas: formData.areas,
            image_urls: formData.images,
            video_urls: formData.videos,
            pdf_urls: formData.pdfs,
          })
          .eq("id", editingId)
          .eq("provider_id", user.id)

        if (error) {
          console.error("Error updating service:", error)
          toast({
            title: "No se pudo actualizar el servicio",
            description: error.message || "Revisa los datos e intenta nuevamente.",
            variant: "destructive",
          })
        } else {
          updateService(editingId, {
            name: formData.name,
            description: formData.description,
            price: formData.price,
            billingMode: formData.billingMode,
            areas: formData.areas,
            images: formData.images,
            videos: formData.videos,
            pdfs: formData.pdfs,
            maxMembers: max_members,
          })
          setEditingId(null)
          toast({
            title: "Servicio actualizado",
            description: "Los cambios del plan se guardaron correctamente.",
          })
        }
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert({
            provider_id: user.id,
            name: formData.name,
            description: formData.description,
            base_price,
            billing_mode: formData.billingMode,
            is_active: true,
            service_areas: formData.areas,
            image_urls: formData.images,
            video_urls: formData.videos,
            pdf_urls: formData.pdfs,
            max_members,
          })
          .select(
            "id, name, description, base_price, billing_mode, service_areas, image_urls, video_urls, pdf_urls, max_members",
          )
          .single()

        if (error) {
          console.error("Error creating service:", error)
          toast({
            title: "No se pudo crear el servicio",
            description: error.message || "Revisa los datos e intenta nuevamente.",
            variant: "destructive",
          })
        } else if (data) {
          addService({
            id: String(data.id),
            name: data.name || formData.name,
            description: data.description || formData.description,
            price: data.base_price != null ? String(data.base_price) : formData.price,
            billingMode: (data as any).billing_mode || formData.billingMode,
            areas: formData.areas,
            images: formData.images,
            videos: formData.videos,
            pdfs: formData.pdfs,
            maxMembers: max_members,
          })
          toast({
            title: "Servicio creado",
            description: "El nuevo plan quedó guardado correctamente.",
          })
        }
      }
    } catch (e) {
      console.error("Unexpected error submitting service:", e)
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al guardar el servicio.",
        variant: "destructive",
      })
    }

    setFormData({
      name: "",
      description: "",
      price: "",
      billingMode: "one_time",
      areas: serviceAreas,
      images: [],
      videos: [],
      pdfs: [],
      maxMembers: "1",
    })
    setIsAdding(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Mis Servicios</h2>
        {role !== "provider_employee" && (
          <Button
            onClick={() => {
              setEditingId(null)
              setFormData({
                name: "",
                description: "",
                price: "",
                billingMode: "one_time",
                areas: serviceAreas,
                images: [],
                videos: [],
                pdfs: [],
                maxMembers: "1",
              })
              setIsAdding(true)
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!isVerified}
          >
            <Plus className="w-4 h-4" />
            Añadir Servicio
          </Button>
        )}
      </div>

      {!isLoadingProfile && isVerified === false && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle>Cuenta de proveedor pendiente de verificación</AlertTitle>
          <AlertDescription>
            Tu cuenta aún no ha sido aprobada por el administrador. Podrás crear y editar servicios una vez que tu perfil
            sea verificado.
          </AlertDescription>
        </Alert>
      )}

      {(role !== "provider_employee") && (isAdding || editingId) && (
        <Card className="p-6 bg-emerald-50 border border-emerald-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Nombre del Servicio</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Consulta General"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Precio (ARS)</label>
                <Input
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="5000"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Cantidad máxima de integrantes (incluye titular)</label>
                <Input
                  name="maxMembers"
                  type="number"
                  min={1}
                  value={formData.maxMembers}
                  onChange={handleChange}
                  placeholder="1"
                  required
                />
                <p className="text-xs text-gray-500">
                  Ejemplo: 1 = plan individual. 4 = plan familiar de hasta 4 personas en total (titular + beneficiarios).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Modalidad de cobro</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={formData.billingMode}
                  onChange={handleBillingModeChange}
                >
                  <option value="one_time">Pago único</option>
                  <option value="monthly">Mensual (póliza)</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Cobertura aplicada</label>
                <div className="space-y-2 text-xs text-gray-600 bg-white border rounded-lg p-3">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.areas.length === 0 && (
                      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-500 border border-dashed border-gray-300">
                        No hay ubicaciones seleccionadas para este servicio.
                      </span>
                    )}
                    {formData.areas.map((area) => (
                      <span
                        key={area}
                        className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm flex items-center gap-1"
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() => handleRemoveArea(area)}
                          className="ml-1 text-red-500 hover:text-red-700"
                          aria-label={`Quitar ${area}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={undoAreas}
                      disabled={areasHistory.length === 0}
                    >
                      Volver
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAreas}
                      disabled={formData.areas.length === 0}
                    >
                      Limpiar
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Input
                      placeholder="Agregar ubicación extra (opcional)"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCustomArea}>
                      Añadir
                    </Button>
                  </div>
                  {newArea && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allCoverageOptions
                        .filter((area) => {
                          return matchesAreaQuery(area, newArea) && !formData.areas.includes(area)
                        })
                        .slice(0, 6)
                        .map((area) => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => {
                              setNewArea("")
                              toggleArea(area)
                            }}
                            className="px-2 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-50"
                          >
                            {area}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Descripción del Servicio</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detalla qué incluye este servicio, beneficios, especificaciones, etc..."
                className="w-full min-h-24 px-3 py-2 border rounded-lg bg-white"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Imágenes
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "images")}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="bg-white px-3 py-1 rounded-full text-sm flex items-center gap-2 border">
                      <span>{img}</span>
                      {idx === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Portada
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCoverImage(idx)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs"
                        >
                          Hacer portada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile("images", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Videos
                </label>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, "videos")}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.videos.map((vid, idx) => (
                    <div key={idx} className="bg-white px-3 py-1 rounded-full text-sm flex items-center gap-2 border">
                      <span>{vid}</span>
                      <button
                        type="button"
                        onClick={() => removeFile("videos", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  PDF (Detalles, Términos, etc)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, "pdfs")}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.pdfs.map((pdf, idx) => (
                    <div key={idx} className="bg-white px-3 py-1 rounded-full text-sm flex items-center gap-2 border">
                      <span>{pdf}</span>
                      <button
                        type="button"
                        onClick={() => removeFile("pdfs", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!isVerified}>
                {editingId ? "Actualizar" : "Crear"} Servicio
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setEditingId(null)
                  setFormData({
                    name: "",
                    description: "",
                    price: "",
                    billingMode: "one_time",
                    areas: serviceAreas,
                    images: [],
                    videos: [],
                    pdfs: [],
                    maxMembers: "1",
                  })
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service: any) => (
          <Card key={service.id} className="p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
              <div className="flex gap-2">
                {role !== "provider_employee" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          name: service.name,
                          description: service.description,
                          price: service.price,
                          billingMode: (service.billingMode as any) || "one_time",
                          areas: service.areas,
                          images: service.images,
                          videos: service.videos,
                          pdfs: service.pdfs,
                          maxMembers: String(service.maxMembers ?? 1),
                        })
                        setEditingId(service.id)
                        setIsAdding(false)
                      }}
                      className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">{service.description}</p>
            <div className="space-y-3 mb-4 text-sm">
              {service.areas && service.areas.length > 0 && (
                <p className="text-gray-700">
                  <span className="font-medium">Ubicaciones del plan:</span> {formatAreas(service.areas)}
                </p>
              )}
              {service.images && service.images.length > 0 && (
                <div className="space-y-1">
                  <p className="text-gray-700 font-medium">Imágenes:</p>
                  <div className="flex flex-wrap gap-2">
                    {service.images.slice(0, 4).map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-16 h-16 rounded-md overflow-hidden border bg-gray-50"
                      >
                        <img src={url} alt="Imagen del servicio" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {(service.videos.length > 0 || service.pdfs.length > 0) && (
                <p className="text-gray-700">
                  <span className="font-medium">Otros archivos:</span> {service.videos.length} videos, {service.pdfs.length} PDFs
                </p>
              )}
            </div>
            <div className="flex justify-between items-end pt-4 border-t">
              <p className="text-2xl font-bold text-emerald-600">${service.price}</p>
            </div>
          </Card>
        ))}
      </div>

      {services.length === 0 && !isAdding && (
        <Card className="p-12 text-center bg-gray-50">
          <p className="text-gray-500 mb-4">No has añadido servicios aún</p>
          <Button
            onClick={() => {
              setEditingId(null)
              setFormData({
                name: "",
                description: "",
                price: "",
                billingMode: "one_time",
                areas: serviceAreas,
                images: [],
                videos: [],
                pdfs: [],
                maxMembers: "1",
              })
              setIsAdding(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!isVerified}
          >
            Crear tu primer servicio
          </Button>
        </Card>
      )}
    </div>
  )
}
