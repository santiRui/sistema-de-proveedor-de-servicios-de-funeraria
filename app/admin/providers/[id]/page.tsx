import { getProvidersList } from "@/app/admin/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProviderDetailActions } from "@/components/admin/provider-detail-actions"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Mail, Building, FileText, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function ProviderDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const providers = await getProvidersList()
  const provider = providers.find(p => p.id === id)

  if (!provider) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Proveedor no encontrado</h2>
        <Link href="/admin/providers">
          <Button variant="link" className="mt-4">Volver a la lista</Button>
        </Link>
      </div>
    )
  }

  // service_areas ya viene como array de texto desde la acción
  const serviceAreas: string[] = Array.isArray(provider.service_areas) ? provider.service_areas : []

  return (
    <div className="space-y-6">
      {/* Header de navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/providers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{provider.business_name}</h1>
            <p className="text-sm text-slate-500">Detalle del Proveedor</p>
          </div>
        </div>
        <ProviderDetailActions providerId={provider.id} isVerified={provider.verified} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal (Info General) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                Información Comercial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Razón Social / Nombre Fantasía</p>
                  <p className="text-lg font-medium">{provider.business_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">CUIT</p>
                  <p className="text-lg">{provider.cuit || "No especificado"}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Descripción del Servicio</p>
                <div className="bg-gray-50 p-4 rounded-md text-gray-700 whitespace-pre-wrap border border-gray-100">
                  {provider.description || "Sin descripción"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Áreas de Cobertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                      {area.replace(":", " ›")}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No ha especificado áreas de cobertura.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral (Contacto y Estado) */}
        <div className="space-y-6">
          {/* Estado */}
          <Card className={provider.verified ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Estado de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={provider.verified ? "bg-emerald-600" : "bg-amber-500"}>
                  {provider.verified ? "VERIFICADO" : "PENDIENTE DE REVISIÓN"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {provider.verified 
                  ? "Este proveedor está activo y visible para los clientes."
                  : "Este proveedor requiere aprobación para operar."}
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Registrado el {provider.created_at ? format(new Date(provider.created_at), "PPP", { locale: es }) : "-"}
              </p>
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" />
                Datos de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm">{provider.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-sm">{provider.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Dirección Base</p>
                  <p className="text-sm">{provider.address}</p>
                  <p className="text-xs text-gray-500">{provider.city}, {provider.province}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
