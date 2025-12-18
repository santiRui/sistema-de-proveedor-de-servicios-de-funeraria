"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useServiceStore } from "@/lib/store/service-store"
import { ServiceCard } from "./service-card"
import { PriceComparison } from "./price-comparison"
import { Grid, BarChart3 } from "lucide-react"

type ViewMode = "grid" | "comparison"

export function ServiceCatalogPage() {
  const { services } = useServiceStore()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    category: "",
    priceMin: "",
    priceMax: "",
    city: "",
  })
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectService = (serviceId: string) => {
    setSelectedServices(
      (prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId].slice(-3)), // Max 3 comparisons
    )
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filters.category || service.category === filters.category
    const matchesCity = !filters.city || service.provider.city.toLowerCase().includes(filters.city.toLowerCase())
    const price = Number.parseInt(service.price)
    const matchesPrice =
      (!filters.priceMin || price >= Number.parseInt(filters.priceMin)) &&
      (!filters.priceMax || price <= Number.parseInt(filters.priceMax))

    return matchesSearch && matchesCategory && matchesCity && matchesPrice
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-bold text-xl">ServiceHub - Catálogo</span>
          </div>
          <Button variant="outline">Iniciar Sesión</Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Catálogo de Servicios de Salud</h1>
          <p className="text-muted-foreground text-lg">Explora, compara y reserva servicios profesionales de salud</p>
        </div>

        <div className="mb-8 space-y-4">
          <Input
            placeholder="Busca servicios, especialidades o proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Categoría</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                <option value="medical">Medicina General</option>
                <option value="physio">Fisioterapia</option>
                <option value="dental">Odontología</option>
                <option value="psychology">Psicología</option>
                <option value="nutrition">Nutrición</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Precio Mínimo (ARS)</label>
              <Input
                type="number"
                name="priceMin"
                placeholder="0"
                value={filters.priceMin}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Precio Máximo (ARS)</label>
              <Input
                type="number"
                name="priceMax"
                placeholder="100000"
                value={filters.priceMax}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Ciudad</label>
              <Input name="city" placeholder="Buenos Aires" value={filters.city} onChange={handleFilterChange} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {filteredServices.length} servicio{filteredServices.length !== 1 ? "s" : ""} disponible
            {filteredServices.length !== 1 ? "s" : ""}
          </p>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              className="gap-2"
            >
              <Grid className="w-4 h-4" />
              Vista Grid
            </Button>
            <Button
              variant={viewMode === "comparison" ? "default" : "outline"}
              onClick={() => setViewMode("comparison")}
              className="gap-2"
              disabled={selectedServices.length < 2}
            >
              <BarChart3 className="w-4 h-4" />
              Comparar ({selectedServices.length})
            </Button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedServices.includes(service.id)}
                onSelect={() => handleSelectService(service.id)}
              />
            ))}
          </div>
        ) : (
          <PriceComparison services={filteredServices.filter((s) => selectedServices.includes(s.id))} />
        )}

        {filteredServices.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No se encontraron servicios con esos criterios</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setFilters({ category: "", priceMin: "", priceMax: "", city: "" })
              }}
            >
              Limpiar Filtros
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
