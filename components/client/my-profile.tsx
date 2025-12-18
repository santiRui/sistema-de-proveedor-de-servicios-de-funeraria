"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getProfile, updateProfile } from "@/app/client/actions"
import { Loader2, Save } from "lucide-react"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"

export function MyProfile() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    dni: "",
    birth_date: "",
    country: "Argentina",
    province: "",
    city: "",
    department: ""
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile()
        if (profile) {
          setFormData({
            full_name: profile.full_name || "",
            email: "", 
            phone: profile.phone || "",
            dni: profile.dni || "",
            birth_date: profile.birth_date || "",
            country: profile.country || "Argentina",
            province: profile.province || "",
            city: profile.city || "",
            department: profile.department || ""
          })
        }
      } catch (error) {
        console.error("Error loading profile", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'province') {
      setFormData(prev => ({ ...prev, province: value, city: "" }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const data = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'email') data.append(key, value)
    })

    const result = await updateProfile(data)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: result.message || 'Guardado correctamente' })
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

  const availableDepartments = formData.province ? (DEPARTMENTS_BY_PROVINCE[formData.province] || []) : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Mi Perfil</h2>
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
          
          {/* Datos Personales */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input 
                id="full_name" 
                name="full_name" 
                value={formData.full_name} 
                onChange={handleChange} 
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI / Documento</Label>
              <Input 
                id="dni" 
                name="dni" 
                value={formData.dni} 
                onChange={handleChange} 
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input 
                id="birth_date" 
                name="birth_date" 
                type="date"
                value={formData.birth_date} 
                onChange={handleChange} 
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input 
              id="phone" 
              name="phone" 
              type="tel"
              value={formData.phone} 
              onChange={handleChange} 
              disabled={!isEditing}
            />
          </div>

          {/* Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
             <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <select 
                id="province"
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
              <Label htmlFor="city">Departamento / Partido</Label>
              {isEditing ? (
                availableDepartments.length > 0 ? (
                   <select 
                    id="city"
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
                      id="city"
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
            <Label htmlFor="department">Dirección Exacta</Label>
            <Input 
              id="department" 
              name="department" 
              value={formData.department} 
              onChange={handleChange} 
              disabled={!isEditing}
              placeholder="Calle, Altura, Piso, Depto..."
            />
          </div>

          {isEditing && (
            <Button type="submit" disabled={isSaving} className="bg-emerald-700 hover:bg-emerald-800 text-white w-full">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
