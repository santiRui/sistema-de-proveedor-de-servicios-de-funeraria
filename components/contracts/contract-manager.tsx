"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePaymentStore } from "@/lib/store/payment-store"
import { FileText, Download, Eye, Printer } from "lucide-react"

export function ContractManager() {
  const { orders } = usePaymentStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Mis Contratos</h1>
          <p className="text-muted-foreground mt-2">Gestiona todos tus contratos de servicios de salud</p>
        </div>

        {orders.length > 0 ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{order.service}</h3>
                      <p className="text-muted-foreground">{order.provider}</p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Fecha: {new Date(order.date).toLocaleDateString("es-AR")}</span>
                        <span>Monto: ${order.price}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                          {order.status === "paid" ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <details className="cursor-pointer">
                    <summary className="font-medium text-sm hover:text-blue-600">Ver términos del contrato</summary>
                    <div className="mt-3 text-sm text-muted-foreground space-y-2">
                      <p>
                        <strong>Partes:</strong> {order.provider} (Proveedor) y Cliente (Beneficiario)
                      </p>
                      <p>
                        <strong>Servicio:</strong> {order.service}
                      </p>
                      <p>
                        <strong>Precio Acordado:</strong> ${order.price}
                      </p>
                      <p>
                        <strong>Fecha de Prestación:</strong> {new Date(order.date).toLocaleDateString("es-AR")}
                      </p>
                      <p className="mt-4">
                        <strong>Términos:</strong> El servicio se prestará conforme a los estándares profesionales. El
                        cliente se compromete al pago en la fecha pactada. El proveedor garantiza la confidencialidad y
                        uso adecuado de los datos del cliente.
                      </p>
                    </div>
                  </details>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No tienes contratos aún</p>
            <p className="text-sm text-muted-foreground">Los contratos aparecerán aquí una vez realices pagos</p>
          </Card>
        )}
      </div>
    </div>
  )
}
