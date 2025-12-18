"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "@/app/auth/actions"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SignUpFormProps {
  onSwitchMode: () => void
}

export function SignUpForm({ onSwitchMode }: SignUpFormProps) {
  const [userType, setUserType] = useState<"client" | "provider">("client")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { toast } = useToast()
  
  // Estados para selectores dependientes
  const [formProvince, setFormProvince] = useState("")

  const handleFormProvinceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormProvince(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    
    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const birthDateStr = formData.get("birth_date") as string | null
    const dni = formData.get("dni") as string | null
    const clientPhone = formData.get("phone") as string | null
    const cuit = formData.get("cuit") as string | null
    const providerPhone = formData.get("phone") as string | null

    if (password !== confirmPassword) {
      const msg = "Las contraseñas no coinciden"
      setError(msg)
      toast({
        title: "Error en el registro",
        description: msg,
        variant: "destructive",
      })
      return
    }

    const onlyDigits = (value: string | null) => !value || /^[0-9]+$/.test(value)

    // Validar DNI y teléfono para clientes
    if (userType === "client") {
      if (!onlyDigits(dni)) {
        const msg = "El DNI solo puede contener números."
        setError(msg)
        toast({ title: "Dato inválido", description: msg, variant: "destructive" })
        return
      }
      if (!onlyDigits(clientPhone)) {
        const msg = "El teléfono solo puede contener números."
        setError(msg)
        toast({ title: "Dato inválido", description: msg, variant: "destructive" })
        return
      }
    }

    // Validar CUIT y teléfono para proveedores
    if (userType === "provider") {
      if (!onlyDigits(cuit)) {
        const msg = "El CUIT solo puede contener números."
        setError(msg)
        toast({ title: "Dato inválido", description: msg, variant: "destructive" })
        return
      }
      if (!onlyDigits(providerPhone)) {
        const msg = "El teléfono solo puede contener números."
        setError(msg)
        toast({ title: "Dato inválido", description: msg, variant: "destructive" })
        return
      }
    }

    // Validar edad mínima (16 años) solo para clientes
    if (birthDateStr && birthDateStr !== "" && userType === "client") {
      const birth = new Date(birthDateStr)
      if (!Number.isNaN(birth.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--
        }

        if (age < 16) {
          const msg = "Debes tener al menos 16 años para registrarte."
          setError(msg)
          toast({
            title: "Edad no permitida",
            description: msg,
            variant: "destructive",
          })
          return
        }
      }
    }
    
    setIsLoading(true)

    formData.append('type', userType)
    
    // Nota: Las áreas de servicio se configuran después del registro en el perfil del proveedor

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      toast({
        title: "No se pudo completar el registro",
        description: result.error,
        variant: "destructive",
      })
      setIsLoading(false)
    } else if (result?.success) {
      const msg = result.message || "Registro exitoso. Revisa tu correo para confirmar la cuenta."
      setSuccessMessage(msg)
      toast({
        title: "Registro exitoso",
        description: msg,
      })
      setIsLoading(false)
    }
  }

  if (successMessage) {
    return (
      <Card className="p-8 space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">¡Registro Exitoso!</h2>
          <p className="text-gray-600 mt-4 mb-6">{successMessage}</p>
          <Button onClick={onSwitchMode} variant="outline" className="w-full">
            Ir a Iniciar Sesión
          </Button>
        </div>
      </Card>
    )
  }

  // Lista de departamentos según la provincia seleccionada
  const availableDepartments = formProvince ? (DEPARTMENTS_BY_PROVINCE[formProvince] || []) : []

  return (
    <Card className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold text-emerald-900">Crea tu Cuenta</h2>
        <p className="text-gray-600 mt-1">Completa tus datos para unirte</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de Tipo */}
        <div className="space-y-2">
          <Label className="text-emerald-900 font-semibold">Tipo de Cuenta</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setUserType("client"); setFormProvince(""); }}
              className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                userType === "client"
                  ? "border-teal-600 bg-teal-50 text-teal-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => { setUserType("provider"); setFormProvince(""); }}
              className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                userType === "provider"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              Proveedor
            </button>
          </div>
        </div>

        {/* Campos Comunes */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" name="email" placeholder="tu@email.com" required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input type="password" name="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Contraseña</Label>
            <Input type="password" name="confirmPassword" required minLength={6} />
          </div>
        </div>

        {/* ==========================================
            Campos Específicos de CLIENTE 
           ========================================== */}
        {userType === "client" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-emerald-900">Datos Personales</h3>
            
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input name="name" placeholder="Juan Pérez" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input name="dni" placeholder="12345678" required inputMode="numeric" pattern="[0-9]*" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="11 12345678"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Nacimiento</Label>
              <Input name="birth_date" type="date" required />
              <p className="text-xs text-gray-500">Debes ser mayor de edad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provincia</Label>
                <select 
                  name="province" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  required
                  value={formProvince}
                  onChange={handleFormProvinceSelect}
                >
                  <option value="">Seleccionar...</option>
                  {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Departamento / Partido</Label>
                {availableDepartments.length > 0 ? (
                  <select 
                    name="city" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <Input 
                    name="city" 
                    placeholder={formProvince ? "Escribe tu localidad" : "Selecciona provincia primero"} 
                    required 
                    disabled={!formProvince}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Exacta</Label>
              <Input name="department" placeholder="Calle, Altura, Piso, Depto..." required />
            </div>
          </div>
        )}

        {/* ==========================================
            Campos Específicos de PROVEEDOR 
           ========================================== */}
        {userType === "provider" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-emerald-900">Datos del Proveedor</h3>

            <div className="space-y-2">
              <Label>Nombre de la Empresa</Label>
              <Input name="business_name" placeholder="Ej. Enfermería Total" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input
                  name="cuit"
                  placeholder="20123456789"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  title="El CUIT solo puede contener números, sin guiones ni espacios. Ejemplo: 20123456789"
                />
                <p className="text-xs text-gray-500">
                  Ingresa el CUIT solo con números, sin guiones ni espacios. Ejemplo: <span className="font-mono">20123456789</span>.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Teléfono de Contacto</Label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="11 12345678"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>

            <div className="space-y-2">
               <Label>Descripción del Servicio</Label>
               <textarea 
                 name="description" 
                 className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                 placeholder="Describe brevemente tu experiencia y servicios..."
                 required
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provincia (Base)</Label>
                <select 
                  name="province" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  required
                  value={formProvince}
                  onChange={handleFormProvinceSelect}
                >
                  <option value="">Seleccionar...</option>
                  {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Departamento / Partido (Base)</Label>
                {availableDepartments.length > 0 ? (
                  <select 
                    name="city" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <Input 
                    name="city" 
                    placeholder={formProvince ? "Escribe tu localidad" : "Selecciona provincia primero"} 
                    required 
                    disabled={!formProvince}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Comercial</Label>
              <Input name="address" placeholder="Calle y altura" required />
            </div>

            <p className="text-sm text-gray-500 italic">
              * Podrás configurar las áreas de cobertura detalladas una vez que inicies sesión.
            </p>
          </div>
        )}

        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white mt-6" disabled={isLoading}>
          {isLoading ? "Creando cuenta..." : "Registrarse"}
        </Button>
      </form>

      <div className="text-center pb-4">
        <span className="text-gray-600">¿Ya tienes cuenta? </span>
        <button onClick={onSwitchMode} className="text-emerald-700 font-medium hover:underline">
          Inicia sesión aquí
        </button>
      </div>
    </Card>
  )
}
