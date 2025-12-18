"use client"

import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string | null
    const confirm = formData.get("confirmPassword") as string | null

    if (!password || !confirm) {
      const msg = "Debes completar ambos campos de contraseña."
      setError(msg)
      toast({ title: "Dato incompleto", description: msg, variant: "destructive" })
      setIsLoading(false)
      return
    }

    if (password !== confirm) {
      const msg = "Las contraseñas no coinciden."
      setError(msg)
      toast({ title: "Contraseña inválida", description: msg, variant: "destructive" })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      const msg = "La nueva contraseña debe tener al menos 6 caracteres."
      setError(msg)
      toast({ title: "Contraseña muy corta", description: msg, variant: "destructive" })
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        toast({ title: "No se pudo actualizar la contraseña", description: error.message, variant: "destructive" })
      } else {
        const msg = "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión."
        setSuccess(msg)
        toast({ title: "Contraseña actualizada", description: msg })
      }
    } catch (err: any) {
      console.error("Unexpected error updating password", err)
      const msg = "Ocurrió un error inesperado al actualizar tu contraseña. Intenta nuevamente."
      setError(msg)
      toast({ title: "Error inesperado", description: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-8 space-y-6 max-w-md mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-emerald-900">Restablecer contraseña</h2>
        <p className="text-gray-600 mt-1 text-sm">
          Ingresa una nueva contraseña para tu cuenta. Este enlace solo funciona una vez.
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-emerald-900">Nueva contraseña</label>
          <Input type="password" name="password" required minLength={6} placeholder="••••••••" disabled={!!success} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-emerald-900">Confirmar nueva contraseña</label>
          <Input
            type="password"
            name="confirmPassword"
            required
            minLength={6}
            placeholder="••••••••"
            disabled={!!success}
          />
        </div>
        {success ? (
          <Button
            type="button"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/auth"
              }
            }}
          >
            Volver al inicio
          </Button>
        ) : (
          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : "Guardar nueva contraseña"}
          </Button>
        )}
      </form>
    </Card>
  )
}
