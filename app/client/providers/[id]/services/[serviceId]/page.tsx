import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { MapPin, Phone, Star } from "lucide-react"
import Image from "next/image"
import { PlanQuotationButton } from "@/components/client/plan-quotation-button"
import { ImageCarousel } from "@/components/client/image-carousel"

interface ServiceDetailPageProps {
  params: Promise<{
    id: string
    serviceId: string
  }>
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const resolvedParams = await params
  const providerId = resolvedParams.id
  const serviceId = resolvedParams.serviceId

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

  // Traer proveedor (para cabecera básica)
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("business_name, cover_image_url, description")
    .eq("id", providerId)
    .single()

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("phone, province, city")
    .eq("id", providerId)
    .single()

  // Traer servicio completo
  const { data: service } = await supabase
    .from("services")
    .select("id, name, description, base_price, service_areas, image_urls, video_urls, pdf_urls")
    .eq("id", serviceId)
    .eq("provider_id", providerId)
    .single()

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Plan no disponible</h1>
          <p className="text-sm text-muted-foreground">
            No se pudo encontrar la información de este plan. Es posible que haya sido eliminado o que ya no esté
            disponible.
          </p>
        </Card>
      </div>
    )
  }

  const priceNumber = service.base_price != null ? Number(service.base_price) : null
  const priceLabel = priceNumber != null ? `$${priceNumber}` : "Consultar"
  const areas = (service.service_areas as string[] | null) || []
  const images = (service.image_urls as string[] | null) || []
  const videos = (service.video_urls as string[] | null) || []
  const pdfs = (service.pdf_urls as string[] | null) || []

  const rating = 5
  const reviews = 0

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        {/* Cabecera proveedor */}
        <Card className="overflow-hidden">
          {providerProfile?.cover_image_url ? (
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
              <h1 className="text-2xl font-bold">{providerProfile?.business_name || "Proveedor"}</h1>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-muted-foreground ml-2">({reviews} reviews)</span>
              </div>
            </div>

            {providerProfile?.description && (
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

        {/* Detalle del plan */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{service.name}</h2>
            <p className="text-emerald-700 font-medium mt-1 text-lg">{priceLabel}</p>
          </div>

          {service.description && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Descripción del plan</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{service.description}</p>
            </div>
          )}

          {areas.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Zonas de cobertura</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {areas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </div>
          )}

          {(images.length > 0 || videos.length > 0 || pdfs.length > 0) && (
            <div className="space-y-3 pt-2 border-t">
              {images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Imágenes</h3>
                  <ImageCarousel images={images} alt={service.name} />
                </div>
              )}

              {videos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Videos</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {videos.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                          Ver video
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pdfs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Documentos</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {pdfs.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                          Ver documento
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-start">
            <PlanQuotationButton providerId={providerId} />
          </div>
        </Card>
      </main>
    </div>
  )
}
