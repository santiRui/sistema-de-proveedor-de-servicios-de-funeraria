import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { MapPin, Phone, Star } from "lucide-react"
import Image from "next/image"
import { PlanQuotationButton } from "@/components/client/plan-quotation-button"

interface ProviderPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProviderPublicProfile({ params }: ProviderPageProps) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Verificar usuario autenticado y rol cliente
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "client") {
    redirect("/auth")
  }

  const profileId = await params
  const providerId = profileId.id

  // Cargar datos del proveedor (si RLS lo permite)
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("id, business_name, description, verified, cover_image_url")
    .eq("id", providerId)
    .single()

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("phone, province, city")
    .eq("id", providerId)
    .single()

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, base_price, service_areas, image_urls")
    .eq("provider_id", providerId)

  const servicesList = (services || []).map((svc: any) => {
    const priceNumber = svc.base_price != null ? Number(svc.base_price) : null
    const priceLabel = priceNumber != null ? `$${priceNumber}` : "Consultar"
    const areas = (svc.service_areas as string[] | null) || []
    const firstImage = ((svc.image_urls as string[] | null) || [])[0]

    return {
      id: String(svc.id),
      name: svc.name as string,
      description: (svc.description as string) || "",
      priceLabel,
      areas,
      firstImage,
    }
  })

  const rating = 5
  const reviews = 0

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        {!providerProfile || !providerProfile.verified ? (
          <Card className="p-6">
            <h1 className="text-xl font-semibold mb-2">Proveedor no disponible</h1>
            <p className="text-sm text-muted-foreground">
              No se pudo cargar la información de este proveedor. Es posible que no exista, no esté verificado
              todavía o que su información no sea pública.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
          {providerProfile.cover_image_url ? (
            <div className="relative h-40 w-full">
              <Image
                src={providerProfile.cover_image_url}
                alt={providerProfile.business_name || "Proveedor"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-r from-emerald-100 to-emerald-200" />
          )}

          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">{providerProfile.business_name || "Proveedor"}</h1>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-muted-foreground ml-2">({reviews} reviews)</span>
              </div>
            </div>

            {providerProfile.description && (
              <p className="text-sm text-muted-foreground">{providerProfile.description}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>
                  {baseProfile?.city}, {baseProfile?.province}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{baseProfile?.phone}</span>
              </div>
            </div>
          </div>
        </Card>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Planes y servicios disponibles</h2>

          {servicesList.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">
              Este proveedor aún no tiene servicios publicados.
            </Card>
          )}

          {servicesList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicesList.map((svc) => (
                <Card key={svc.id} className="overflow-hidden">
                  {svc.firstImage ? (
                    <div className="relative h-32 w-full">
                      <Image src={svc.firstImage} alt={svc.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gray-100" />
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{svc.name}</h3>
                      <p className="text-emerald-700 font-medium mt-1">{svc.priceLabel}</p>
                    </div>

                    {svc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{svc.description}</p>
                    )}

                    {svc.areas.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Zonas de cobertura:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {svc.areas.slice(0, 4).map((area) => (
                            <li key={area}>{area}</li>
                          ))}
                          {svc.areas.length > 4 && <li>y otras zonas...</li>}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <a
                        href={`/client/providers/${providerId}/services/${svc.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        Ver detalle
                      </a>
                      <PlanQuotationButton providerId={providerId} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
