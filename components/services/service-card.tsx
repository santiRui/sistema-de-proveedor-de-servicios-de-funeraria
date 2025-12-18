"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { useServiceStore } from "@/lib/store/service-store"
import { Star, MapPin, Clock, CheckCircle } from "lucide-react"

interface ServiceCardProps {
  service: ReturnType<typeof useServiceStore>["services"][0]
  isSelected: boolean
  onSelect: () => void
}

export function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps) {
  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all ${isSelected ? "ring-2 ring-blue-600" : ""}`}>
      <div className="bg-gradient-to-r from-blue-500 to-green-500 h-24"></div>

      <div className="p-6 space-y-4">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">{service.name}</h3>
              <p className="text-sm text-muted-foreground">{service.provider.businessName}</p>
            </div>
            {isSelected && <CheckCircle className="w-6 h-6 text-blue-600" />}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{service.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-medium">{service.provider.rating}/5</span>
            <span className="text-muted-foreground">({service.provider.reviews} reviews)</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>{service.provider.city}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span>{service.duration}</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Desde</p>
              <p className="text-3xl font-bold text-green-600">${service.price}</p>
            </div>
            {service.provider.verified && (
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Verificado</div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={onSelect} variant={isSelected ? "default" : "outline"} className="flex-1">
              {isSelected ? "Seleccionado" : "Seleccionar"}
            </Button>
            <Button className="flex-1">Reservar</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
