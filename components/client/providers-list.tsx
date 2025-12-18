"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Star, ChevronRight } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { ARGENTINA_PROVINCES, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"
import { QuotationModal } from "./quotation-modal"
import { getDepartmentAliases } from "@/lib/utils"

interface Filters {
  province: string
  department: string
}

interface ProviderResult {
  id: string
  businessName: string
  description: string
  phone: string
  city: string
  province: string
  rating: number
  reviews: number
  coverImageUrl?: string
  serviceAreas: string[]
}

export function ProvidersList() {
  const router = useRouter()

  const [filters, setFilters] = useState<Filters>({ province: "", department: "" })
  const [providers, setProviders] = useState<ProviderResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [showQuotationModal, setShowQuotationModal] = useState(false)

  useEffect(() => {
    async function loadInitialFilters() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("province, city")
        .eq("id", user.id)
        .single()

      if (clientProfile?.province && clientProfile?.city) {
        const normalizePrefill = (value: string) =>
          (value || "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[:]/g, " ")
            .toLowerCase()
            .trim()

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

        setFilters({ province, department: matchedDept ? matchedDept : "Todos" })
      }
    }

    loadInitialFilters()
  }, [])

  useEffect(() => {
    async function loadProviders() {
      setLoading(true)
      const supabase = createClient()

      const { data: providerProfiles, error: providerError } = await supabase
        .from("provider_profiles")
        .select("id, business_name, description, verified, cover_image_url, service_areas")
        .eq("verified", true)

      if (providerError || !providerProfiles) {
        console.error("Error fetching providers for providers list:", providerError)
        setProviders([])
        setLoading(false)
        return
      }

      const providerIds = providerProfiles.map((p) => p.id)

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, phone, province, city")
        .in("id", providerIds)

      if (profilesError) {
        console.error("Error fetching base profiles for providers list:", profilesError)
      }

      const mapped: ProviderResult[] = providerProfiles.map((p) => {
        const profile = profiles?.find((prof) => prof.id === p.id)
        const serviceAreas = ((p as any).service_areas as string[] | null) || []

        return {
          id: p.id,
          businessName: p.business_name || "Proveedor",
          description: p.description || "",
          phone: profile?.phone || "",
          city: profile?.city || "",
          province: profile?.province || "",
          rating: 5,
          reviews: 0,
          coverImageUrl: (p as any).cover_image_url || undefined,
          serviceAreas,
        }
      })

      setProviders(mapped)
      setLoading(false)
    }

    loadProviders()
  }, [])

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const normalizeText = (value: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[:]/g, " ")
      .toLowerCase()
      .trim()

  const providerCoversLocation = (areas: string[], province: string, department: string) => {
    const prov = (province || "").trim()
    const dept = (department || "").trim()
    if (!prov) return true

    if (!dept || dept === "Todos") {
      const provNorm = normalizeText(prov)
      return (areas || []).some((a) => {
        const aNorm = normalizeText(a)
        return aNorm === provNorm || aNorm.startsWith(`${provNorm} `)
      })
    }

    const provNorm = normalizeText(prov)
    const aliases = Array.from(getDepartmentAliases(prov, dept))
    const targetNorms = aliases.map((d) => normalizeText(`${prov}: ${d}`))
    return (areas || []).some((a) => {
      const aNorm = normalizeText(a)
      if (aNorm === provNorm) return true
      return targetNorms.includes(aNorm)
    })
  }

  const filteredProviders = providers.filter((provider) => {
    // Sin filtros: todos
    if (!filters.province) return true

    const areas = provider.serviceAreas || []

    return providerCoversLocation(areas, filters.province, filters.department)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-6">Buscar Proveedores</h2>

        <Card className="p-6 bg-white border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provincia</label>
              <select
                name="province"
                value={filters.province}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters({ province: value, department: value ? "Todos" : "" })
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
          </div>
        </Card>
      </div>

      {loading && <p>Cargando proveedores...</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <Card key={provider.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {provider.coverImageUrl ? (
                <div className="relative h-32 w-full">
                  <Image
                    src={provider.coverImageUrl}
                    alt={provider.businessName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 h-32" />
              )}

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{provider.businessName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(provider.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">({provider.reviews} reviews)</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{provider.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>
                      {provider.city}, {provider.province}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>{provider.phone}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/client/providers/${provider.id}`)}
                  >
                    Ver planes
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      setSelectedProvider(provider.id)
                      setShowQuotationModal(true)
                    }}
                  >
                    Solicitar cotización
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredProviders.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No se encontraron proveedores con esos criterios</p>
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                province: "",
                department: "",
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
          isOpen={showQuotationModal}
          onClose={() => {
            setShowQuotationModal(false)
            setSelectedProvider(null)
          }}
        />
      )}
    </div>
  )
}
