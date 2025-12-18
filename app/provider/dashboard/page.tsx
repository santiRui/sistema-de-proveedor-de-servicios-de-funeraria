import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProviderDashboardContent } from "@/components/provider/dashboard-content"

export default async function ProviderDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  // Verificar rol en base de datos
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "provider" && profile.role !== "provider_employee")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Restringido</h1>
        <p className="text-gray-600 mb-4">
          Esta cuenta está registrada como <strong>{profile?.role === 'client' ? 'Cliente' : profile?.role}</strong>, 
          pero intentas acceder al panel de Proveedor.
        </p>
        <a href="/auth" className="text-blue-600 hover:underline">Volver al inicio de sesión</a>
      </div>
    )
  }

  return <ProviderDashboardContent user={user} />
}
