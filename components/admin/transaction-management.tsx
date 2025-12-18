"use client"
import { useAdminStore } from "@/lib/store/admin-store"
import { CheckCircle, Clock, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TransactionManagement() {
  const { transactions } = useAdminStore()

  const statusConfig = {
    completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    failed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Transacciones</h2>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Exportar Reporte
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium">ID Transacción</th>
              <th className="text-left py-3 px-4 font-medium">Proveedor</th>
              <th className="text-left py-3 px-4 font-medium">Cliente</th>
              <th className="text-left py-3 px-4 font-medium">Monto</th>
              <th className="text-left py-3 px-4 font-medium">Comisión</th>
              <th className="text-left py-3 px-4 font-medium">Estado</th>
              <th className="text-left py-3 px-4 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const config = statusConfig[tx.status as keyof typeof statusConfig]
              const Icon = config.icon
              return (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{tx.id}</td>
                  <td className="py-3 px-4">{tx.providerName}</td>
                  <td className="py-3 px-4">{tx.clientName}</td>
                  <td className="py-3 px-4 font-bold">${tx.amount}</td>
                  <td className="py-3 px-4 text-muted-foreground">${tx.commission}</td>
                  <td className="py-3 px-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-sm font-medium ${config.color}`}>
                        {tx.status === "completed" ? "Completada" : tx.status === "pending" ? "Pendiente" : "Fallida"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{new Date(tx.date).toLocaleDateString("es-AR")}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
