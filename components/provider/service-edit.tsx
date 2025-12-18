"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { X, Upload } from "lucide-react"

interface ServiceEditProps {
  serviceId: string
}

export function ServiceEdit({ serviceId }: ServiceEditProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceAreas, setServiceAreas] = useState<string[]>([])
  const [newArea, setNewArea] = useState("")
  const [areasHistory, setAreasHistory] = useState<string[][]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    areas: [] as string[],
    images: [] as string[],
    videos: [] as string[],
    pdfs: [] as string[],
  })

  const allCoverageOptions: string[] = ARGENTINA_PROVINCES.flatMap((province) => {
    const depts = DEPARTMENTS_BY_PROVINCE[province] || []
    return depts.map((dept) => `${province}: ${dept}`)
  })

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

  useEffect(() => {
    async function loadService() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth")
          return
        }

        const { data: profile } = await supabase
          .from("provider_profiles")
          .select("service_areas")
          .eq("id", user.id)
          .single()

        setServiceAreas(profile?.service_areas || [])

        const { data, error } = await supabase
          .from("services")
          .select("id, name, description, base_price, service_areas, image_urls, video_urls, pdf_urls")
          .eq("id", serviceId)
          .eq("provider_id", user.id)
          .single()

        if (error || !data) {
          router.push("/provider/dashboard")
          return
        }

        setFormData({
          name: data.name || "",
          description: data.description || "",
          price: data.base_price != null ? String(data.base_price) : "",
          areas: (data.service_areas as string[] | null) || profile?.service_areas || [],
          images: (data.image_urls as string[] | null) || [],
          videos: (data.video_urls as string[] | null) || [],
          pdfs: (data.pdf_urls as string[] | null) || [],
        })
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [router, serviceId])

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
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const base_price = formData.price ? Number(formData.price) : null

      const { error } = await supabase
        .from("services")
        .update({
          name: formData.name,
          description: formData.description,
          base_price,
          service_areas: formData.areas,
          image_urls: formData.images,
          video_urls: formData.videos,
          pdf_urls: formData.pdfs,
        })
        .eq("id", serviceId)
        .eq("provider_id", user.id)

      if (error) {
        console.error("Error updating service:", error)
        return
      }

      router.push("/provider/dashboard")
    } catch (e) {
      console.error("Unexpected error submitting service:", e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Cargando servicio...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Editar servicio</h1>
        <Card className="p-6 bg-white border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Nombre del Servicio</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
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
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Ubicaciones del plan</label>
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
                      .filter((area) => matchesAreaQuery(area, newArea) && !formData.areas.includes(area))
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Descripción del Servicio</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
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

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/provider/dashboard")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
