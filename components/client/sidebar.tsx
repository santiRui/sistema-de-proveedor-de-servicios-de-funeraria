"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, FileText, Check, LogOut, User } from "lucide-react"
import { signout } from "@/app/auth/actions"

type Tab = "search" | "providers" | "quotations" | "contracts" | "profile"

interface ClientSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function ClientSidebar({ activeTab, onTabChange }: ClientSidebarProps) {
  const router = useRouter()
  
  const menuItems = [
    { id: "search" as Tab, label: "Buscar Servicios", icon: Search },
    { id: "providers" as Tab, label: "Proveedores", icon: User },
    { id: "quotations" as Tab, label: "Mis Cotizaciones", icon: FileText },
    { id: "contracts" as Tab, label: "Mis Contratos", icon: Check },
    { id: "profile" as Tab, label: "Mi Perfil", icon: User },
  ]

  const handleLogout = async () => {
    await signout()
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
            <p className="text-emerald-600 text-xs font-medium">Cliente</p>
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
