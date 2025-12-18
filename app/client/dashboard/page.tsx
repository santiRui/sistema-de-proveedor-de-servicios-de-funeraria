import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientDashboardContent } from "@/components/client/dashboard-content"

export default async function ClientDashboard() {
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

  if (!profile || profile.role !== "client") {
    // Si el usuario existe pero tiene otro rol, mostrar mensaje
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Restringido</h1>
        <p className="text-gray-600 mb-4">
          Esta cuenta está registrada como <strong>{profile?.role === 'provider' ? 'Proveedor' : profile?.role}</strong>, 
          pero intentas acceder al panel de Cliente.
        </p>
        <a href="/auth" className="text-blue-600 hover:underline">Volver al inicio de sesión</a>
      </div>
    )
  }

  return <ClientDashboardContent user={user} />
}
