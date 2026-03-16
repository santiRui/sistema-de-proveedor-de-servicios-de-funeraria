"use client"

import type React from "react"
import { useState } from "react"
import { Sidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev: boolean) => !prev)
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex font-sans text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <div className="flex-1 flex flex-col">
        <AdminHeader onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
