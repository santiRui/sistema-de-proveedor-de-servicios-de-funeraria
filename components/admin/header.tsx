"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AdminHeader() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-semibold text-emerald-900">Panel de Control</h2>
        <p className="text-xs text-gray-500">Administración General</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">Administrador</p>
          <p className="text-xs text-emerald-600 font-medium">Super Admin</p>
        </div>
        <Avatar className="h-9 w-9 border-2 border-emerald-100">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback className="bg-emerald-100 text-emerald-700">AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
