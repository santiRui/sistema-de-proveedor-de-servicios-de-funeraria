"use client"

import { Card } from "@/components/ui/card"
import { Users, Building2, TrendingUp, DollarSign } from "lucide-react"

export function AdminOverview() {
  const stats = [
    {
      title: "Usuarios Totales",
      value: "1,234",
      change: "+12%",
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Proveedores Activos",
      value: "342",
      change: "+8%",
      icon: Building2,
      color: "bg-green-500",
    },
    {
      title: "Transacciones Este Mes",
      value: "2,156",
      change: "+23%",
      icon: TrendingUp,
      color: "bg-purple-500",
    },
    {
      title: "Ingresos Totales",
      value: "$342,500",
      change: "+18%",
      icon: DollarSign,
      color: "bg-orange-500",
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Resumen de Plataforma</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  <p className="text-green-600 text-sm mt-1">{stat.change} desde el mes anterior</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            {[
              { user: "Juan Pérez", action: "Registrado como cliente", time: "hace 2 horas" },
              { user: "Dra. García", action: "Perfil verificado", time: "hace 4 horas" },
              { user: "María López", action: "Completó primer contrato", time: "hace 1 día" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">{item.user}</p>
                  <p className="text-sm text-muted-foreground">{item.action}</p>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Servicios Populares</h3>
          <div className="space-y-3">
            {[
              { name: "Consulta Médica General", count: 456 },
              { name: "Fisioterapia", count: 342 },
              { name: "Odontología", count: 298 },
              { name: "Psicología", count: 215 },
            ].map((service, i) => (
              <div key={i} className="flex justify-between items-center">
                <p className="text-sm">{service.name}</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(service.count / 456) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{service.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
