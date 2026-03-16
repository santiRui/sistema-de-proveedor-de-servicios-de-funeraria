"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function AdminHeader({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void
}) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold text-emerald-900">Panel de Control</h2>
        <p className="text-xs text-gray-500">Administración General</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">Administrador</p>
          <p className="text-xs text-emerald-600 font-medium">Super Admin</p>
        </div>
        <Avatar className="h-9 w-9 border-2 border-emerald-100">
          <AvatarImage src="/icon.svg" />
          <AvatarFallback className="bg-emerald-100 text-emerald-700">AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
