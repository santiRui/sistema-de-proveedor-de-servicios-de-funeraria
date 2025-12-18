"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAdminStore } from "@/lib/store/admin-store"
import { Check, X, Eye } from "lucide-react"

export function ProviderApproval() {
  const { pendingProviders, approveProvider, rejectProvider } = useAdminStore()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Verificación de Proveedores</h2>
        <p className="text-muted-foreground">Revisa y aprueba nuevos proveedores que se registren en la plataforma</p>
      </div>

      <div className="space-y-4">
        {pendingProviders.map((provider) => (
          <Card key={provider.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{provider.businessName}</h3>
                <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="font-medium">
                      {provider.city}, {provider.province}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{provider.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{provider.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Servicios</p>
                    <p className="font-medium">{provider.servicesCount} registrados</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">Documentos Requeridos:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {provider.documents.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedProvider(provider.id)} className="gap-2">
                  <Eye className="w-4 h-4" />
                  Ver Detalles
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                onClick={() => approveProvider(provider.id)}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Aprobar Proveedor
              </Button>
              <Button onClick={() => rejectProvider(provider.id)} variant="destructive" className="flex-1 gap-2">
                <X className="w-4 h-4" />
                Rechazar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {pendingProviders.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-2">No hay proveedores pendientes de aprobación</p>
          <p className="text-sm text-muted-foreground">Todos los proveedores han sido verificados</p>
        </Card>
      )}
    </div>
  )
}
