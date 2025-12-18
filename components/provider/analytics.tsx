"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

const viewsData = [
  { month: "Ene", views: 400, inquiries: 240 },
  { month: "Feb", views: 520, inquiries: 390 },
  { month: "Mar", views: 680, inquiries: 490 },
  { month: "Abr", views: 890, inquiries: 720 },
]

const earningsData = [
  { week: "Sem 1", earnings: 12000 },
  { week: "Sem 2", earnings: 18000 },
  { week: "Sem 3", earnings: 15000 },
  { week: "Sem 4", earnings: 22000 },
]

export function ProviderAnalytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Estadísticas</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Visualizaciones</p>
          <p className="text-3xl font-bold mt-2">2,890</p>
          <p className="text-green-600 text-sm mt-1">+12% este mes</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Consultas</p>
          <p className="text-3xl font-bold mt-2">47</p>
          <p className="text-green-600 text-sm mt-1">+8% este mes</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Contratos</p>
          <p className="text-3xl font-bold mt-2">23</p>
          <p className="text-green-600 text-sm mt-1">49% de conversión</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Ingresos</p>
          <p className="text-3xl font-bold mt-2">$67,000</p>
          <p className="text-green-600 text-sm mt-1">Este mes</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Visualizaciones vs Consultas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={viewsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="views" fill="#3b82f6" name="Visualizaciones" />
            <Bar dataKey="inquiries" fill="#10b981" name="Consultas" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Ingresos Semanales</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} name="Ingresos" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
