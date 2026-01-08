"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Save, ChevronDown, ChevronUp } from "lucide-react"
import { getProviderProfile, updateProviderProfile } from "@/app/provider/actions"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"

export function ProviderProfile() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const [formData, setFormData] = useState({
    business_name: "",
    cuit: "",
    phone: "",
    email: "",
    description: "",
    address: "",
    province: "",
    city: "",
    country: "Argentina",
    service_areas: [] as string[],
    cover_image_url: "",
    mp_client_id: "",
    mp_client_secret: "",
    mp_user_id: null as number | null,
    mp_connected_at: null as string | null,
    verificationStatus: false
  })

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getProviderProfile()
        if (data) {
          setFormData({
            business_name: data.business_name || "",
            cuit: data.cuit || "",
            phone: data.phone || "",
            email: data.email || "",
            description: data.description || "",
            address: data.address || "",
            province: data.province || "",
            city: data.city || "",
            country: data.country || "Argentina",
            service_areas: data.service_areas || [],
            cover_image_url: data.cover_image_url || "",
            mp_client_id: (data as any).mp_client_id || "",
            mp_client_secret: (data as any).mp_client_secret || "",
            mp_user_id: (data as any).mp_user_id ?? null,
            mp_connected_at: (data as any).mp_connected_at ?? null,
            verificationStatus: data.verified
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingCover(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMessage({ type: 'error', text: 'Debes iniciar sesión para subir la portada.' })
        return
      }

      const path = `${user.id}/cover-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('provider-covers').upload(path, file, {
        upsert: true,
      })

      if (uploadError) {
        console.error('Error uploading cover image', uploadError)
        setMessage({ type: 'error', text: 'No se pudo subir la imagen de portada. Intenta nuevamente.' })
        return
      }

      const { data: publicData } = supabase.storage.from('provider-covers').getPublicUrl(path)
      const publicUrl = publicData?.publicUrl

      if (!publicUrl) {
        setMessage({ type: 'error', text: 'No se pudo obtener la URL pública de la portada.' })
        return
      }

      setFormData((prev) => ({ ...prev, cover_image_url: publicUrl }))
      setMessage({ type: 'success', text: 'Imagen de portada subida correctamente. No olvides guardar el perfil.' })
    } catch (err) {
      console.error('Unexpected error uploading cover image', err)
      setMessage({ type: 'error', text: 'Ocurrió un error subiendo la portada.' })
    } finally {
      setIsUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'province') {
      setFormData(prev => ({ ...prev, province: value, city: "" }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Lógica de selección de áreas (Provincias y Departamentos)
  const toggleProvinceExpand = (province: string) => {
    setExpandedProvince(expandedProvince === province ? null : province)
  }

  const isProvinceFullySelected = (province: string) => {
    const depts = DEPARTMENTS_BY_PROVINCE[province] || []
    if (depts.length === 0) return false
    return depts.every(d => formData.service_areas.includes(`${province}: ${d}`))
  }

  const isProvincePartiallySelected = (province: string) => {
    const depts = DEPARTMENTS_BY_PROVINCE[province] || []
    if (depts.length === 0) return false
    const selectedCount = depts.filter(d => formData.service_areas.includes(`${province}: ${d}`)).length
    return selectedCount > 0 && selectedCount < depts.length
  }

  const handleProvinceCheckbox = (province: string) => {
    if (!isEditing) return
    const depts = DEPARTMENTS_BY_PROVINCE[province] || []
    const allSelected = isProvinceFullySelected(province)
    
    let newAreas = [...formData.service_areas]
    
    if (allSelected) {
      // Deseleccionar todos los departamentos de esta provincia
      newAreas = newAreas.filter(a => !a.startsWith(`${province}:`))
    } else {
      // Seleccionar todos los departamentos
      // Primero removemos los que ya estén para evitar duplicados
      newAreas = newAreas.filter(a => !a.startsWith(`${province}:`))
      // Luego agregamos todos
      const toAdd = depts.map(d => `${province}: ${d}`)
      newAreas = [...newAreas, ...toAdd]
    }
    
    setFormData(prev => ({ ...prev, service_areas: newAreas }))
  }

  const handleDepartmentCheckbox = (province: string, department: string) => {
    if (!isEditing) return
    const value = `${province}: ${department}`
    
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(value)
        ? prev.service_areas.filter(a => a !== value)
        : [...prev.service_areas, value]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const data = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'service_areas') {
        data.append(key, JSON.stringify(value))
      } else if (key !== 'verificationStatus' && key !== 'email') {
        data.append(key, value as string)
      }
    })

    const result = await updateProviderProfile(data)

    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: result?.message || 'Guardado correctamente' })
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

  const availableDepartments = formData.province ? (DEPARTMENTS_BY_PROVINCE[formData.province] || []) : []
  const mpConnected = !!formData.mp_connected_at && !!formData.mp_user_id

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Mi Perfil Profesional</h2>
        <Button 
          onClick={() => {
            if (isEditing) setMessage(null)
            setIsEditing(!isEditing)
          }} 
          variant={isEditing ? "outline" : "default"}
        >
          {isEditing ? "Cancelar Edición" : "Editar Perfil"}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Datos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre Comercial</Label>
              <Input
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                name="cuit"
                value={formData.cuit}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
             <div className="space-y-2">
              <Label>Email (Solo lectura)</Label>
              <Input
                value={formData.email}
                disabled={true}
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full min-h-[100px] px-3 py-2 border rounded-md disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* Mercado Pago */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Mercado Pago (cobros)</p>
                <p className="text-sm text-gray-500">
                  Carga tu Client ID y Client Secret para conectar tu cuenta y recibir pagos.
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${mpConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {mpConnected ? "Conectado" : "No conectado"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>MP Client ID</Label>
                <Input
                  name="mp_client_id"
                  value={formData.mp_client_id}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Ej: 1234567890123456"
                />
              </div>

              <div className="space-y-2">
                <Label>MP Client Secret</Label>
                <Input
                  name="mp_client_secret"
                  value={formData.mp_client_secret}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Ej: APP_USR-..."
                  type="password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!formData.mp_client_id || !formData.mp_client_secret}
                onClick={() => {
                  window.location.href = "/api/mercadopago/oauth/start"
                }}
              >
                Conectar Mercado Pago
              </Button>
            </div>
          </div>

          {/* Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <div className="space-y-2">
              <Label>Provincia</Label>
              <select 
                name="province" 
                value={formData.province} 
                onChange={handleChange}
                disabled={!isEditing}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar...</option>
                {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Departamento / Partido</Label>
              {isEditing ? (
                availableDepartments.length > 0 ? (
                   <select 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Seleccionar...</option>
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder={formData.province ? "Selecciona..." : "Selecciona provincia primero"}
                    disabled={!formData.province}
                  />
                )
              ) : (
                <Input value={formData.city} disabled />
              )}
            </div>
          </div>

           <div className="space-y-2">
              <Label>Dirección Comercial</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

          <div className="space-y-2">
            <Label>Imagen de portada (URL)</Label>
            <Input
              name="cover_image_url"
              value={formData.cover_image_url}
              onChange={handleChange}
              placeholder="https://..."
              disabled={!isEditing}
            />
            <p className="text-xs text-gray-500">
              Usa una URL de imagen accesible públicamente (por ejemplo, desde Supabase Storage). Esta imagen se mostrará
              como portada en el buscador de proveedores.
            </p>
            <div className="mt-2 space-y-1">
              <Label>Subir imagen de portada desde archivo</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={!isEditing || isUploadingCover}
                onChange={handleCoverFileChange}
              />
              {isUploadingCover && (
                <p className="text-xs text-gray-500">Subiendo imagen de portada...</p>
              )}
            </div>
          </div>

          {/* Áreas de Cobertura Expandibles */}
          <div className="space-y-2 border rounded-md p-4 bg-gray-50 mt-4">
             <Label className="mb-4 block font-semibold text-lg">Áreas de Cobertura</Label>
             <p className="text-sm text-gray-500 mb-4">Selecciona las provincias y departamentos donde prestas servicio.</p>
             
             <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
               {ARGENTINA_PROVINCES.map(province => {
                 const isExpanded = expandedProvince === province
                 const isFullySelected = isProvinceFullySelected(province)
                 const isPartiallySelected = isProvincePartiallySelected(province)
                 const departments = DEPARTMENTS_BY_PROVINCE[province] || []

                 return (
                   <div key={province} className="border rounded bg-white overflow-hidden">
                     <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                       <div className="flex items-center space-x-3">
                         <input 
                           type="checkbox" 
                           className={`w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 ${isPartiallySelected ? 'opacity-50' : ''}`}
                           checked={isFullySelected || isPartiallySelected}
                           onChange={() => handleProvinceCheckbox(province)}
                           disabled={!isEditing}
                         />
                         <span className="font-medium">{province}</span>
                         <span className="text-xs text-gray-400">({departments.length} depts)</span>
                       </div>
                       <Button 
                         type="button" 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => toggleProvinceExpand(province)}
                         className="h-8 w-8 p-0"
                       >
                         {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                       </Button>
                     </div>
                     
                     {isExpanded && (
                       <div className="p-3 border-t bg-gray-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                         {departments.map(dept => (
                           <label key={dept} className={`flex items-center space-x-2 p-1 rounded text-sm ${isEditing ? 'cursor-pointer hover:bg-gray-200' : 'opacity-80'}`}>
                             <input 
                               type="checkbox" 
                               className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                               checked={formData.service_areas.includes(`${province}: ${dept}`)}
                               onChange={() => handleDepartmentCheckbox(province, dept)}
                               disabled={!isEditing}
                             />
                             <span className="truncate" title={dept}>{dept}</span>
                           </label>
                         ))}
                       </div>
                     )}
                   </div>
                 )
               })}
             </div>
           </div>

          {/* Estado */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-900">Estado de Verificación</p>
            <p className={`capitalize mt-1 font-bold ${formData.verificationStatus ? 'text-green-600' : 'text-amber-600'}`}>
              {formData.verificationStatus ? 'Verificado' : 'Pendiente'}
            </p>
          </div>

          {isEditing && (
            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
