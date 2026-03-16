import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAdminStats } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Clock, ShieldCheck } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

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

  if (!profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Restringido</h1>
        <p className="text-gray-600 mb-4">
          Esta cuenta está registrada como <strong>{profile?.role}</strong>, pero intentas acceder al panel de Administrador.
        </p>
        <a href="/auth" className="text-blue-600 hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  const stats = await getAdminStats()

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Proveedores"
          value={stats.totalProviders}
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          description="Registrados en la plataforma"
        />
        <StatsCard
          title="Proveedores Verificados"
          value={stats.verifiedProviders}
          icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
          description="Activos y visibles"
        />
        <StatsCard
          title="Pendientes de Verificación"
          value={stats.pendingProviders}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Requieren revisión"
        />
        <StatsCard
          title="Total Clientes"
          value={stats.totalClients}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Usuarios registrados"
        />
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
