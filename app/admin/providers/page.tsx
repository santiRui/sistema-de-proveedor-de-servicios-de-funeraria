import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProvidersList } from "../actions"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProviderActions } from "@/components/admin/provider-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function AdminProvidersPage() {
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

  const providers = await getProvidersList()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Gestión de Proveedores</h2>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa / Nombre</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900">{provider.business_name || "Sin nombre comercial"}</p>
                    <p className="text-sm text-slate-500">{provider.full_name}</p>
                    <p className="text-xs text-slate-400">{provider.email}</p>
                  </div>
                </TableCell>
                <TableCell>{provider.cuit || "-"}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{provider.province || "-"}</p>
                    <p className="text-slate-500">{provider.city}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {provider.created_at 
                    ? format(new Date(provider.created_at), "d MMM yyyy", { locale: es }) 
                    : "-"}
                </TableCell>
                <TableCell>
                  {provider.verified ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Verificado</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <ProviderActions providerId={provider.id} isVerified={provider.verified || false} />
                </TableCell>
              </TableRow>
            ))}
            
            {providers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No hay proveedores registrados aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
