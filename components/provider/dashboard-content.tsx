"use client"

import { useEffect, useState } from "react"
import { ProviderSidebar, type Tab } from "@/components/provider/sidebar"
import { ProviderProfile } from "@/components/provider/profile"
import { ServiceManagement } from "@/components/provider/service-management"
import { ProviderAnalytics } from "@/components/provider/analytics"
import { ProviderQuotations } from "@/components/provider/quotations"
import { ProviderContracts } from "@/components/provider/contracts"
import { ProviderClients } from "@/components/provider/clients"
import { ProviderEmployees } from "@/components/provider/employees"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface ProviderDashboardContentProps {
  user: any
}

export function ProviderDashboardContent({ user }: ProviderDashboardContentProps) {
  const isEmployee = user.user_metadata?.role === "provider_employee"
  const [activeTab, setActiveTab] = useState<Tab>(isEmployee ? "quotations" : "profile")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("provider_dashboard_active_tab") as Tab | null

    const allowedTabs: Tab[] = isEmployee
      ? ["quotations", "quotationsRejected", "contracts", "clients"]
      : ["profile", "services", "quotations", "quotationsRejected", "contracts", "clients", "employees", "analytics"]

    if (stored && allowedTabs.includes(stored)) {
      setActiveTab(stored)
    }
  }, [isEmployee])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    window.localStorage.setItem("provider_dashboard_active_tab", tab)
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
        <ProviderSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          role={user.user_metadata?.role || "provider"}
        />
      </div>

      {/* Sidebar móvil como overlay desde la izquierda */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="h-full bg-white shadow-xl w-64">
            <ProviderSidebar
              activeTab={activeTab}
              onTabChange={handleMobileTabChange}
              role={user.user_metadata?.role || "provider"}
            />
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
                <h1 className="text-2xl font-bold">Panel de Proveedor</h1>
                <p className="text-muted-foreground">Bienvenido, {user.user_metadata?.full_name || user.email}</p>
              </div>
            </div>
          </div>
          {!isEmployee && activeTab === "profile" && <ProviderProfile />}
          {!isEmployee && activeTab === "services" && <ServiceManagement />}
          {(activeTab === "quotations" || activeTab === "quotationsRejected") && (
            <ProviderQuotations focusClientRejected={activeTab === "quotationsRejected"} />
          )}
          {activeTab === "contracts" && <ProviderContracts />}
          {activeTab === "clients" && <ProviderClients />}
          {!isEmployee && activeTab === "employees" && <ProviderEmployees />}
          {!isEmployee && activeTab === "analytics" && <ProviderAnalytics />}
        </div>
      </main>
    </div>
  )
}
