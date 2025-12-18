"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface HeroProps {
  onGetStarted: () => void
}

export function LandingHero({ onGetStarted }: HeroProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-xl">ServiceHub</span>
        </div>
        <Button variant="outline" onClick={onGetStarted}>
          Ingresar
        </Button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h1 className="text-5xl font-bold leading-tight text-foreground">
            Conecta con los mejores proveedores de servicios de salud
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Encuentra, compara y contrata servicios profesionales de salud en tu zona. Rápido, seguro y confiable.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <span className="text-lg">Proveedores verificados</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <span className="text-lg">Cotizaciones transparentes</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <span className="text-lg">Pagos seguros integrados</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button size="lg" onClick={onGetStarted}>
              Comenzar Ahora
            </Button>
            <Button size="lg" variant="outline">
              Aprende más
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h3 className="text-2xl font-bold">¿Qué eres?</h3>
          <div className="space-y-4">
            <div className="p-6 border-2 border-blue-200 rounded-xl hover:border-blue-600 cursor-pointer transition-colors">
              <h4 className="font-bold text-lg mb-2">Soy Cliente</h4>
              <p className="text-muted-foreground">Busco servicios de salud profesionales</p>
            </div>
            <div className="p-6 border-2 border-green-200 rounded-xl hover:border-green-600 cursor-pointer transition-colors">
              <h4 className="font-bold text-lg mb-2">Soy Proveedor</h4>
              <p className="text-muted-foreground">Ofrezco servicios de salud certificados</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
