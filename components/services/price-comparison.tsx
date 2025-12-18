"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { useServiceStore } from "@/lib/store/service-store"
import { CheckCircle } from "lucide-react"

interface PriceComparisonProps {
  services: ReturnType<typeof useServiceStore>["services"]
}

export function PriceComparison({ services }: PriceComparisonProps) {
  if (services.length < 2) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Selecciona al menos 2 servicios para compararlos</p>
      </Card>
    )
  }

  const features = ["Consulta Inicial", "Seguimiento", "Documentación", "Reportes", "Disponibilidad 24/7"]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-4 px-6 font-bold">Característica</th>
            {services.map((service) => (
              <th key={service.id} className="py-4 px-6 text-center">
                <div className="space-y-2">
                  <p className="font-bold text-lg">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.provider.businessName}</p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b bg-green-50">
            <td className="py-4 px-6 font-bold">Precio</td>
            {services.map((service) => (
              <td key={service.id} className="py-4 px-6 text-center">
                <p className="text-2xl font-bold text-green-600">${service.price}</p>
              </td>
            ))}
          </tr>

          {features.map((feature) => (
            <tr key={feature} className="border-b hover:bg-gray-50">
              <td className="py-4 px-6">{feature}</td>
              {services.map((service) => (
                <td key={service.id} className="py-4 px-6 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <td className="py-4 px-6 font-bold">Acción</td>
            {services.map((service) => (
              <td key={service.id} className="py-4 px-6 text-center">
                <Button size="sm">Reservar</Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
