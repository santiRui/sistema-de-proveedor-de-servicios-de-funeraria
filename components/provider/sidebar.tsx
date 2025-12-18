"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Building2, BarChart3, Settings, LogOut, FileText, Users, FileSignature } from "lucide-react"
import { useAuthStore } from "@/lib/store/auth-store"

export type Tab =
  | "profile"
  | "services"
  | "quotations"
  | "quotationsRejected"
  | "contracts"
  | "clients"
  | "employees"
  | "analytics"

interface ProviderSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  role?: string
}

export function ProviderSidebar({ activeTab, onTabChange, role }: ProviderSidebarProps) {
  const router = useRouter()
  const { signOut } = useAuthStore()

  const baseMenuItems = [
    { id: "profile" as Tab, label: "Mi Perfil", icon: Building2 },
    { id: "services" as Tab, label: "Mis Servicios", icon: Settings },
    { id: "quotations" as Tab, label: "Cotizaciones", icon: FileText },
    { id: "quotationsRejected" as Tab, label: "Cotizaciones rechazadas", icon: FileText },
    { id: "contracts" as Tab, label: "Contratos", icon: FileSignature },
    { id: "clients" as Tab, label: "Clientes", icon: Users },
    { id: "employees" as Tab, label: "Empleados", icon: Users },
    { id: "analytics" as Tab, label: "Estadísticas", icon: BarChart3 },
  ]

  const menuItems =
    role === "provider_employee"
      ? baseMenuItems.filter(
          (item) => item.id !== "profile" && item.id !== "services" && item.id !== "analytics" && item.id !== "employees",
        )
      : baseMenuItems

  const handleLogout = () => {
    signOut()
    router.push("/")
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 text-gray-900 p-6 flex flex-col justify-between shadow-sm">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-huzKiElUb8p7PhCYTUKJxJ44hgTcVF.png"
            alt="Memorial Home"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Memorial Home</h1>
            <p className="text-emerald-600 text-xs font-medium">Proveedor</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-emerald-50 text-emerald-700 font-medium border-l-4 border-emerald-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
      >
        <LogOut className="w-5 h-5" />
        <span>Cerrar Sesión</span>
      </button>
    </aside>
  )
}
