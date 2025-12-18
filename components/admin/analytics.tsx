"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

const revenueData = [
  { month: "Enero", revenue: 45000, commission: 4500 },
  { month: "Febrero", revenue: 52000, commission: 5200 },
  { month: "Marzo", revenue: 68000, commission: 6800 },
  { month: "Abril", revenue: 76000, commission: 7600 },
]

const userTypeData = [
  { name: "Clientes", value: 892, fill: "#3b82f6" },
  { name: "Proveedores", value: 342, fill: "#10b981" },
]

const serviceDistribution = [
  { name: "Consulta Médica", value: 35 },
  { name: "Fisioterapia", value: 25 },
  { name: "Odontología", value: 22 },
  { name: "Otros", value: 18 },
]

export function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Analíticas de Plataforma</h2>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Ingresos vs Comisiones</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Ingresos Totales" />
            <Bar dataKey="commission" fill="#10b981" name="Comisiones" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Distribución de Usuarios</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={userTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Servicios Más Solicitados</h3>
          <div className="space-y-4">
            {serviceDistribution.map((service, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{service.name}</span>
                  <span className="text-sm font-bold">{service.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${service.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Crecimiento de Usuarios</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Transacciones Totales" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
