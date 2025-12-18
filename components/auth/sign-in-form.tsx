"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { login, requestPasswordReset } from "@/app/auth/actions"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SignInFormProps {
  onSwitchMode: () => void
}

export function SignInForm({ onSwitchMode }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    // En modo recuperación de contraseña solo enviamos el email
    if (isResetMode) {
      const result = await requestPasswordReset(formData)
      if (result?.error) {
        setError(result.error)
        toast({
          title: "No se pudo enviar el correo",
          description: result.error,
          variant: "destructive",
        })
      } else {
        const msg = result?.message || "Te enviamos un correo para restablecer tu contraseña."
        toast({ title: "Correo enviado", description: msg })
        setError("")
        setResetSent(true)
      }
      setIsLoading(false)
      return
    }

    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      toast({
        title: "No se pudo iniciar sesión",
        description: result.error,
        variant: "destructive",
      })
      setIsLoading(false)
    } else {
      toast({
        title: "Inicio de sesión correcto",
        description: "Te estamos redirigiendo a tu panel...",
      })
    }
    // Si no hay error, el server action redirige automáticamente
  }

  return (
    <Card className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-900">
          {isResetMode ? "Recuperar contraseña" : "Inicia Sesión"}
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          {isResetMode
            ? resetSent
              ? "Te enviamos un correo. Ingresa al enlace que recibiste para cambiar tu contraseña."
              : "Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña."
            : "Bienvenido a Memorial Home"}
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {!isResetMode || !resetSent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-emerald-900">Email</label>
            <Input type="email" name="email" placeholder="tu@email.com" required />
          </div>
          {!isResetMode && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-900">Contraseña</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-emerald-700 hover:underline"
                onClick={() => {
                  setIsResetMode(true)
                  setError("")
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </>
        )}

        {isResetMode && (
          <p className="text-xs text-gray-600">
            Te enviaremos un correo con un enlace para que puedas definir una nueva contraseña.
          </p>
        )}

        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" disabled={isLoading}>
          {isLoading ? (isResetMode ? "Enviando correo..." : "Iniciando sesión...") : isResetMode ? "Enviar enlace" : "Inicia Sesión"}
        </Button>
      </form>
      ) : (
        <p className="text-sm text-gray-600">Revisa tu correo y usa el enlace para cambiar tu contraseña.</p>
      )}

      <div className="text-center">
        {!isResetMode && (
          <>
            <span className="text-gray-600">¿No tienes cuenta? </span>
            <button onClick={onSwitchMode} className="text-emerald-700 font-medium hover:underline">
              Regístrate aquí
            </button>
          </>
        )}

        {isResetMode && !resetSent && (
          <div className="mt-2 text-xs text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false)
                setError("")
              }}
              className="text-emerald-700 font-medium hover:underline"
            >
              Volver a iniciar sesión
            </button>
          </div>
        )}

        {isResetMode && resetSent && (
          <div className="mt-4 text-sm text-gray-600">
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false)
                setResetSent(false)
                setError("")
              }}
              className="text-emerald-700 font-medium hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
