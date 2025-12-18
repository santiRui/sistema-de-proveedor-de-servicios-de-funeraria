"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Heart, DollarSign, Zap, MapPin, Lock, History } from "lucide-react"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-huzKiElUb8p7PhCYTUKJxJ44hgTcVF.png"
              alt="Memorial Home"
              width={50}
              height={50}
              className="w-12 h-12"
            />
            <h1 className="text-2xl font-bold text-emerald-800">Memorial Home</h1>
          </div>
          <Button onClick={() => router.push("/auth")} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            Iniciar Sesión
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-emerald-900 mb-6 text-balance">Paz y Tranquilidad en Momentos Difíciles</h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Conectamos a familias con proveedores de servicios de sepelios confiables y verificados. 
              Cotiza, compara y contrata servicios funerarios con transparencia y respeto.
            </p>
            <Button
              onClick={() => router.push("/auth")}
              size="lg"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-lg"
            >
              Comenzar Ahora
            </Button>
          </div>
          <div className="flex justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-huzKiElUb8p7PhCYTUKJxJ44hgTcVF.png"
              alt="Memorial Home"
              width={300}
              height={300}
              className="w-64 h-64"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-emerald-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-emerald-900 mb-12 text-center">¿Por qué elegir Memorial Home?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Heart className="w-8 h-8 text-emerald-700" />}
              title="Respeto y Confianza"
              description="Trabajamos exclusivamente con empresas funerarias verificadas que garantizan un servicio digno y profesional."
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8 text-emerald-700" />}
              title="Transparencia en Precios"
              description="Accede a presupuestos claros y detallados. Compara opciones sin sorpresas ni costos ocultos."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-emerald-700" />}
              title="Gestión Ágil"
              description="Soluciona la contratación de servicios de manera rápida y remota, para que puedas enfocarte en lo importante."
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8 text-emerald-700" />}
              title="Cobertura Nacional"
              description="Encuentra servicios de sepelio disponibles en tu ciudad o provincia con cobertura garantizada."
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-emerald-700" />}
              title="Seguridad y Privacidad"
              description="Tus datos y decisiones se manejan con la máxima confidencialidad y seguridad."
            />
            <FeatureCard
              icon={<History className="w-8 h-8 text-emerald-700" />}
              title="Soporte Integral"
              description="Una plataforma diseñada para simplificar trámites y coordinaciones en momentos complejos."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-700 to-emerald-600 py-20 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold mb-6">Acompañamiento Profesional</h3>
          <p className="text-xl mb-8 text-emerald-50">
            Si eres proveedor de servicios funerarios, únete a nuestra red para ofrecer tus servicios a quienes más lo necesitan.
          </p>
          <Button
            onClick={() => router.push("/auth")}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-emerald-50 text-lg font-semibold"
          >
            Unirme como Proveedor
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Memorial Home. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-emerald-100">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-emerald-900 mb-3">{title}</h4>
      <p className="text-gray-700">{description}</p>
    </div>
  )
}
