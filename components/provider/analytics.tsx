"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

interface MonthlyIncomePoint {
  monthLabel: string
  income: number
}

export function ProviderAnalytics() {
  const [loading, setLoading] = useState(true)
  const [activeClients, setActiveClients] = useState(0)
  const [activeContracts, setActiveContracts] = useState(0)
  const [cancelledContracts, setCancelledContracts] = useState(0)
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncomePoint[]>([])

  useEffect(() => {
    async function loadAnalytics() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Determinar proveedor efectivo (dueño o empleado)
      let effectiveProviderId: string = (user.user_metadata as any)?.parent_provider_id || user.id

      if (!effectiveProviderId || effectiveProviderId === user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, parent_provider_id")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.role === "provider_employee" && profile.parent_provider_id) {
          effectiveProviderId = profile.parent_provider_id as string
        }
      }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfMonthIso = startOfMonth.toISOString()

      // 1) Ingresos del mes y serie mensual (últimos 6 meses) desde payment_receipts
      const { data: receipts } = await supabase
        .from("payment_receipts")
        .select("amount, issued_at, provider_id")
        .eq("provider_id", effectiveProviderId)

      if (receipts && receipts.length) {
        // Ingresos del mes actual
        const incomeThisMonth = receipts
          .filter((r: any) => new Date(r.issued_at) >= startOfMonth)
          .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
        setMonthIncome(incomeThisMonth)

        // Serie últimos 6 meses
        const points: MonthlyIncomePoint[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const month = d.getMonth()
          const year = d.getFullYear()
          const label = d.toLocaleDateString("es-AR", { month: "short" }).toUpperCase()

          const monthIncomeSum = receipts
            .filter((r: any) => {
              const rd = new Date(r.issued_at)
              return rd.getFullYear() === year && rd.getMonth() === month
            })
            .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

          points.push({ monthLabel: label, income: monthIncomeSum })
        }
        setMonthlyIncome(points)
      } else {
        setMonthIncome(0)
        setMonthlyIncome([])
      }

      // 2) Contratos activos / cancelados y clientes activos
      const { data: orders } = await supabase
        .from("orders")
        .select("id, client_id, provider_id, status, paid_at")
        .eq("provider_id", effectiveProviderId)

      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, order_id, status")

      if (orders && orders.length) {
        // Clientes activos: al menos un pago registrado
        const activeClientIds = new Set<string>()
        for (const o of orders as any[]) {
          if (o.paid_at) {
            activeClientIds.add(o.client_id as string)
          }
        }
        setActiveClients(activeClientIds.size)

        // Contratos activos / cancelados
        let active = 0
        let cancelled = 0
        for (const c of (contracts as any[]) || []) {
          if (c.status === "cancelled") cancelled++
          else active++
        }
        setActiveContracts(active)
        setCancelledContracts(cancelled)
      } else {
        setActiveClients(0)
        setActiveContracts(0)
        setCancelledContracts(0)
      }

      setLoading(false)
    }

    loadAnalytics()
  }, [])

  const formattedMonthIncome = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monthIncome)

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Estadísticas</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Clientes activos</p>
          <p className="text-3xl font-bold mt-2">{loading ? "-" : activeClients}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Contratos activos</p>
          <p className="text-3xl font-bold mt-2">{loading ? "-" : activeContracts}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Contratos cancelados</p>
          <p className="text-3xl font-bold mt-2">{loading ? "-" : cancelledContracts}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">Ingresos del mes</p>
          <p className="text-3xl font-bold mt-2">{loading ? "-" : formattedMonthIncome}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Ingresos mensuales (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyIncome}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Ingresos" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
