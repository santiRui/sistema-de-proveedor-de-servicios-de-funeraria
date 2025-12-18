"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Trash2 } from "lucide-react"

interface Employee {
  id: string
  full_name: string | null
  email: string | null
}

export function ProviderEmployees() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/provider/employees", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar los empleados.")
      }
      setEmployees(data.employees || [])
    } catch (e: any) {
      console.error("Error loading employees", e)
      toast({
        title: "Error al cargar empleados",
        description: e.message || "Intenta nuevamente más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("¿Seguro que deseas eliminar esta cuenta de empleado?")
    if (!confirmed) return

    try {
      const res = await fetch("/api/provider/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar el empleado.")
      }

      toast({
        title: "Empleado eliminado",
        description: "La cuenta de empleado fue eliminada correctamente.",
      })

      setEmployees((prev) => prev.filter((emp) => emp.id !== id))
    } catch (e: any) {
      console.error("Error deleting employee", e)
      toast({
        title: "No se pudo eliminar el empleado",
        description: e.message || "Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa el nombre y el email del empleado.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/provider/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el empleado.")
      }

      toast({
        title: "Empleado creado",
        description: "Se envió la invitación al email ingresado.",
      })

      setName("")
      setEmail("")
      await loadEmployees()
    } catch (e: any) {
      console.error("Error creating employee", e)
      toast({
        title: "No se pudo crear el empleado",
        description: e.message || "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Empleados de mi Empresa</h2>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Crear nuevo empleado</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_auto] gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre completo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email del empleado</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@tuempresa.com"
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear Empleado"}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Se creará una cuenta de empleado asociada a tu empresa. El empleado podrá gestionar cotizaciones y contratos, pero no
          podrá modificar los planes existentes ni ver las estadísticas.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Lista de empleados</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando empleados...</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no has registrado empleados.</p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex justify-between items-center border rounded-lg px-4 py-2 bg-white"
              >
                <div>
                  <p className="font-medium text-gray-900">{emp.full_name || "(Sin nombre)"}</p>
                  <p className="text-sm text-gray-600">{emp.email}</p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8"
                  aria-label="Eliminar empleado"
                  onClick={() => handleDelete(emp.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
