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

interface ProviderDashboardContentProps {
  user: any
}

export function ProviderDashboardContent({ user }: ProviderDashboardContentProps) {
  const isEmployee = user.user_metadata?.role === "provider_employee"
  const [activeTab, setActiveTab] = useState<Tab>(isEmployee ? "quotations" : "profile")

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

  return (
    <div className="flex h-screen bg-background">
      <ProviderSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        role={user.user_metadata?.role || "provider"}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Panel de Proveedor</h1>
            <p className="text-muted-foreground">Bienvenido, {user.user_metadata?.full_name || user.email}</p>
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
