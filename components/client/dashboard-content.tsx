"use client"

import { useEffect, useState } from "react"
import { ClientSidebar } from "@/components/client/sidebar"
import { SearchProviders } from "@/components/client/search-providers"
import { ProvidersList } from "@/components/client/providers-list"
import { MyQuotations } from "@/components/client/my-quotations"
import { MyContracts } from "@/components/client/my-contracts"
import { MyProfile } from "@/components/client/my-profile"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

type Tab = "search" | "providers" | "quotations" | "contracts" | "profile"

interface ClientDashboardContentProps {
  user: any // Recibimos el usuario real desde el servidor
}

export function ClientDashboardContent({ user }: ClientDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("search")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("client_dashboard_active_tab") as Tab | null
    if (
      stored === "search" ||
      stored === "providers" ||
      stored === "quotations" ||
      stored === "contracts" ||
      stored === "profile"
    ) {
      setActiveTab(stored)
    }
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    window.localStorage.setItem("client_dashboard_active_tab", tab)
  }

  const handleMobileTabChange = (tab: Tab) => {
    handleTabChange(tab)
    setIsSidebarOpen(false)
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev: boolean) => !prev)
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Sidebar fija en desktop */}
      <div className="hidden md:block">
        <ClientSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Sidebar móvil como overlay desde la izquierda */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="h-full bg-white shadow-xl w-64">
            <ClientSidebar activeTab={activeTab} onTabChange={handleMobileTabChange} />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={handleCloseSidebar}
          />
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={handleToggleSidebar}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Hola, {user.user_metadata?.full_name || user.email}</h1>
                <p className="text-muted-foreground">Bienvenido a tu panel de control</p>
              </div>
            </div>
          </div>
          {activeTab === "search" && <SearchProviders />}
          {activeTab === "providers" && <ProvidersList />}
          {activeTab === "quotations" && <MyQuotations />}
          {activeTab === "contracts" && <MyContracts />}
          {activeTab === "profile" && <MyProfile />}
        </div>
      </main>
    </div>
  )
}
