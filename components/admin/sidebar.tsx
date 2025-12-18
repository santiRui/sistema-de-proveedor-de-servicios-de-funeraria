"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, LogOut, ShieldCheck } from "lucide-react"
import { signout } from "@/app/auth/actions"
import { cn } from "@/lib/utils"
import Image from "next/image"

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Gestión de Proveedores",
    href: "/admin/providers",
    icon: ShieldCheck,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-emerald-100 flex items-center gap-3">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-huzKiElUb8p7PhCYTUKJxJ44hgTcVF.png"
          alt="Memorial Home"
          width={32}
          height={32}
          className="w-8 h-8"
        />
        <h1 className="text-xl font-bold text-emerald-900">
           Admin Panel
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                isActive 
                  ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100" 
                  : "text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-800"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-600")} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signout()}
          className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium group"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}
