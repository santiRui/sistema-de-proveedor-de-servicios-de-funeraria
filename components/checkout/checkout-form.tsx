"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePaymentStore } from "@/lib/store/payment-store"
import { CheckCircle, Lock } from "lucide-react"

export function CheckoutForm() {
  const { createOrder } = usePaymentStore()
  const [step, setStep] = useState<"review" | "payment" | "confirmation">("review")
  const [orderId, setOrderId] = useState<string | null>(null)

  const mockOrder = {
    id: `ORD-${Date.now()}`,
    service: "Consulta Médica General",
    provider: "Dr. García Médicos",
    price: 5000,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  }

  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  })

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target

    if (name === "cardNumber") {
      value = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim()
    } else if (name === "expiryDate") {
      value = value.replace(/\D/g, "")
      if (value.length >= 2) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4)
      }
    } else if (name === "cvv") {
      value = value.replace(/\D/g, "").slice(0, 3)
    }

    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault()
    const newOrderId = createOrder({
      service: mockOrder.service,
      provider: mockOrder.provider,
      price: mockOrder.price,
      date: mockOrder.date,
      status: "paid",
    })
    setOrderId(newOrderId)
    setStep("confirmation")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Checkout</h1>
          <p className="text-muted-foreground mt-2">Completa tu reserva de forma segura</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {step === "review" && (
              <Card className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Resumen de la Reserva</h2>

                <div className="space-y-4 p-6 bg-blue-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-medium">{mockOrder.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span className="font-medium">{mockOrder.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha programada:</span>
                    <span className="font-medium">{new Date(mockOrder.date).toLocaleDateString("es-AR")}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between">
                    <span className="font-bold">Total:</span>
                    <span className="text-2xl font-bold text-green-600">${mockOrder.price}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold">Términos y Condiciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Al proceder, aceptas nuestros términos y condiciones de servicio. El contrato será generado
                    automáticamente después del pago.
                  </p>
                  <label className="flex items-center gap-2 py-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Aceptar términos y condiciones</span>
                  </label>
                </div>

                <Button onClick={() => setStep("payment")} size="lg" className="w-full">
                  Continuar al Pago
                </Button>
              </Card>
            )}

            {step === "payment" && (
              <Card className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Información de Pago</h2>

                <form onSubmit={handlePayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de Tarjeta</label>
                    <div className="relative">
                      <Input
                        name="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={paymentData.cardNumber}
                        onChange={handlePaymentChange}
                        maxLength="19"
                        required
                      />
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titular de la Tarjeta</label>
                    <Input
                      name="cardHolder"
                      placeholder="Juan Pérez García"
                      value={paymentData.cardHolder}
                      onChange={handlePaymentChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vencimiento (MM/YY)</label>
                      <Input
                        name="expiryDate"
                        placeholder="12/25"
                        value={paymentData.expiryDate}
                        onChange={handlePaymentChange}
                        maxLength="5"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CVV</label>
                      <Input
                        name="cvv"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={handlePaymentChange}
                        maxLength="3"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg flex items-start gap-2">
                    <Lock className="w-5 h-5 text-green-600 mt-1" />
                    <p className="text-sm text-green-700">
                      Tu pago es seguro. Procesamos mediante Mercado Pago con encriptación de nivel bancario.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep("review")} className="flex-1">
                      Atrás
                    </Button>
                    <Button type="submit" className="flex-1">
                      Procesar Pago ${mockOrder.price}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {step === "confirmation" && (
              <Card className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold">¡Pago Realizado!</h2>
                <p className="text-muted-foreground">Tu reserva ha sido confirmada exitosamente</p>

                <div className="bg-blue-50 p-6 rounded-lg space-y-2 text-left">
                  <p className="font-medium">
                    ID de Orden: <span className="font-mono text-sm">{orderId}</span>
                  </p>
                  <p className="font-medium">Confirmación enviada a tu email</p>
                </div>

                <div className="text-left space-y-4 p-6 bg-green-50 rounded-lg">
                  <h3 className="font-bold">Contrato Generado</h3>
                  <p className="text-sm text-muted-foreground">
                    Se ha generado un contrato digital automático con los términos del servicio. Puedes descargarlo
                    desde tu cuenta.
                  </p>
                  <Button variant="outline" className="w-full bg-transparent">
                    Descargar Contrato
                  </Button>
                </div>

                <Button onClick={() => setStep("review")} className="w-full">
                  Ir a Mi Panel de Control
                </Button>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="font-bold text-lg mb-4">Resumen del Pedido</h3>

              <div className="space-y-3 mb-6 pb-6 border-b">
                <div className="flex justify-between text-sm">
                  <span>Servicio</span>
                  <span className="font-medium">${mockOrder.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Comisión plataforma</span>
                  <span className="font-medium text-red-600">-${Math.round(mockOrder.price * 0.1)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold text-green-600">${mockOrder.price}</span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 bg-gray-50 p-3 rounded">
                  <p>Métodos aceptados: Tarjeta de crédito, débito, Mercado Pago</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
