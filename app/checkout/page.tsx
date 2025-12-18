"use client"
import { useAuthStore } from "@/lib/store/auth-store"
import { CheckoutForm } from "@/components/checkout/checkout-form"

export default function CheckoutPage() {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Debes estar registrado para continuar</p>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return <CheckoutForm />
}
