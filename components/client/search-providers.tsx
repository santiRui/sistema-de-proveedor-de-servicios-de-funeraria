"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { useClientStore } from "@/lib/store/client-store"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Phone, ChevronRight } from "lucide-react"
import { QuotationModal } from "./quotation-modal"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { getDepartmentAliases } from "@/lib/utils"
import { useRouter } from "next/navigation"

export function SearchProviders() {
  const router = useRouter()
  const { providers, setProviders } = useClientStore()
  const [filters, setFilters] = useState({
    province: "",
    department: "",
    maxPrice: "",
    minPeople: "",
  })
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null)
  const [showQuotationModal, setShowQuotationModal] = useState(false)

  useEffect(() => {
    async function loadProviders() {
      const supabase = createClient()

      const normalizePrefill = (value: string) =>
        (value || "")
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[:]/g, " ")
          .toLowerCase()
          .trim()

      // 0. Obtener ubicación del cliente desde su perfil (solo para precargar filtros)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("province, city")
          .eq("id", user.id)
          .single()

        if (clientProfile?.province && clientProfile?.city) {
          const province = clientProfile.province
          const city = clientProfile.city
          const depts = DEPARTMENTS_BY_PROVINCE[province] || []
          const cityNorm = normalizePrefill(city)
          const matchedDept = depts.find((d) => {
            const aliases = getDepartmentAliases(province, d)
            for (const a of aliases) {
              if (normalizePrefill(a) === cityNorm) return true
            }
            return false
          })

          setFilters((prev) => ({
            ...prev,
            province,
            department: matchedDept ? matchedDept : "Todos",
          }))
        }
      }

      // 1. Traer perfiles de proveedor verificados
      const { data: providerProfiles, error: providerError } = await supabase
        .from("provider_profiles")
        .select("id, business_name, description, verified, cover_image_url")
        .eq("verified", true)

      if (providerError || !providerProfiles) {
        console.error("Error fetching provider_profiles for client search:", providerError)
        setProviders([])
        return
      }

      const providerIds = providerProfiles.map((p) => p.id)

      // 2. Traer datos de perfil base (ubicación y teléfono)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, province, city")
        .in("id", providerIds)

      if (profilesError) {
        console.error("Error fetching profiles for client search:", profilesError)
      }

      // 3. Traer servicios asociados a cada proveedor (incluyendo áreas de servicio)
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, provider_id, name, description, base_price, service_areas, is_public, max_members")
        .eq("is_public", true)

      if (servicesError) {
        console.error("Error fetching services for client search:", servicesError)
      }

      const servicesByProvider: Record<
        string,
        {
          id: string
          name: string
          description: string
          price: string
          priceNumber: number | null
          maxMembers: number | null
          areas: string[]
        }[]
      > = {}
      ;(servicesData || []).forEach((svc: any) => {
        const priceNumber = svc.base_price != null ? Number(svc.base_price) : null
        const price = priceNumber != null ? `$${priceNumber}` : ""

        const areas = (svc.service_areas as string[] | null) || []

        if (!servicesByProvider[svc.provider_id]) servicesByProvider[svc.provider_id] = []
        servicesByProvider[svc.provider_id].push({
          id: String(svc.id),
          name: svc.name,
          description: svc.description || "",
          price,
          priceNumber,
          maxMembers: typeof svc.max_members === "number" ? svc.max_members : null,
          areas,
        })
      })

      // 4. Mapear al formato del store
      const mappedProviders = providerProfiles.map((p) => {
        const profile = profiles?.find((prof) => prof.id === p.id)
        return {
          id: p.id,
          businessName: p.business_name || profile?.full_name || "Proveedor",
          description: p.description || "",
          phone: profile?.phone || "",
          city: profile?.city || "",
          province: profile?.province || "",
          rating: 5, // TODO: cuando haya ratings reales, reemplazar
          reviews: 0,
          services: servicesByProvider[p.id] || [],
          coverImageUrl: (p as any).cover_image_url || undefined,
        }
      })

      setProviders(mappedProviders)
    }

    loadProviders()
  }, [setProviders])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const maxPriceNumber = filters.maxPrice ? Number(filters.maxPrice) : null
  const minPeopleNumber = filters.minPeople ? Number(filters.minPeople) : null

  const normalizeText = (value: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[:]/g, " ")
      .toLowerCase()
      .trim()

  const serviceCoversLocation = (areas: string[], province: string, department: string) => {
    const prov = (province || "").trim()
    const dept = (department || "").trim()
    if (!prov) return true

    // If department is not selected or is Todos, match any area within province OR a province-wide entry.
    if (!dept || dept === "Todos") {
      const provNorm = normalizeText(prov)
      return (areas || []).some((a) => {
        const aNorm = normalizeText(a)
        return aNorm === provNorm || aNorm.startsWith(`${provNorm} `)
      })
    }

    const aliases = Array.from(getDepartmentAliases(prov, dept))
    const targetNorms = aliases.map((d) => normalizeText(`${prov}: ${d}`))
    const provNorm = normalizeText(prov)
    return (areas || []).some((a) => {
      const aNorm = normalizeText(a)
      // Province-wide entry covers all departments.
      if (aNorm === provNorm) return true
      // Exact department match.
      return targetNorms.includes(aNorm)
    })
  }

  const filteredProviders = providers
    .map((provider: any) => {
      const servicesForFilters = (provider.services || []).filter((svc: any) => {
        // Filtro por ubicación (cobertura del plan)
        if (filters.province) {
          const areas = (svc.areas as string[] | null) || []
          if (!serviceCoversLocation(areas, filters.province, filters.department)) return false
        }

        // Filtro por precio máximo
        if (maxPriceNumber != null && typeof svc.priceNumber === "number") {
          if (svc.priceNumber > maxPriceNumber) return false
        }

        // Filtro por cantidad mínima de personas (capacidad)
        if (minPeopleNumber != null && minPeopleNumber > 0) {
          if (typeof svc.maxMembers === "number") {
            if (svc.maxMembers < minPeopleNumber) return false
          } else {
            // Si el plan no tiene maxMembers definido, no cumple el filtro
            return false
          }
        }

        return true
      })

      return {
        ...provider,
        servicesForFilters,
      }
    })
    .filter((provider: any) => {
      const hasServicesForLocation = provider.servicesForFilters && provider.servicesForFilters.length > 0
      return hasServicesForLocation
    })

  const serviceResults = filteredProviders.flatMap((provider: any) =>
    (provider.servicesForFilters || []).map((svc: any) => ({
      ...svc,
      provider,
    }))
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-6">Buscar Servicios Disponibles</h2>

        <Card className="p-6 bg-white border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provincia</label>
              <select
                name="province"
                value={filters.province}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters((prev) => ({
                    ...prev,
                    province: value,
                    department: value ? "Todos" : "",
                  }))
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                {ARGENTINA_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Municipio / Departamento</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!filters.province}
              >
                <option value="Todos">Todos</option>
                {(filters.province ? DEPARTMENTS_BY_PROVINCE[filters.province] || [] : []).map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Precio Máximo (ARS)</label>
              <Input
                name="maxPrice"
                type="number"
                placeholder="10000"
                value={filters.maxPrice}
                onChange={handleFilterChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad de personas</label>
              <select
                name="minPeople"
                value={filters.minPeople}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                <option value="1">1 o más</option>
                <option value="2">2 o más</option>
                <option value="3">3 o más</option>
                <option value="4">4 o más</option>
                <option value="5">5 o más</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serviceResults.map((item: any, index: number) => (
          <Card key={`${item.id}-${index}`} className="overflow-hidden hover:shadow-lg transition-shadow">
            {item.provider.coverImageUrl ? (
              <div className="relative h-32 w-full">
                <Image
                  src={item.provider.coverImageUrl}
                  alt={item.provider.businessName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 h-32" />
            )}

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Proveedor: {item.provider.businessName}</p>
                {typeof item.maxMembers === "number" && item.maxMembers > 0 && (
                  <div className="mt-1">
                    <span className="text-sm text-muted-foreground">
                      Hasta {item.maxMembers} persona{item.maxMembers === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>
                    {item.provider.city}, {item.provider.province}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{item.provider.phone}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Precio estimado</p>
                <p className="text-lg font-semibold text-emerald-700">{item.price || "Consultar"}</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t mt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => router.push(`/client/providers/${item.provider.id}/services/${item.id}`)}
                >
                  Ver detalle
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProvider(item.provider.id)
                    setSelectedServiceId(String(item.id))
                    setSelectedServiceName(item.name)
                    setShowQuotationModal(true)
                  }}
                  className="flex-1 gap-2"
                >
                  Solicitar Cotización
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {serviceResults.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No se encontraron servicios con esos criterios</p>
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                province: "",
                department: "",
                maxPrice: "",
                minPeople: "",
              })
            }
          >
            Limpiar filtros
          </Button>
        </Card>
      )}

      {selectedProvider && (
        <QuotationModal
          providerId={selectedProvider}
          serviceId={selectedServiceId || undefined}
          serviceName={selectedServiceName || undefined}
          isOpen={showQuotationModal}
          onClose={() => {
            setShowQuotationModal(false)
            setSelectedProvider(null)
            setSelectedServiceId(null)
            setSelectedServiceName(null)
          }}
        />
      )}
    </div>
  )
}
