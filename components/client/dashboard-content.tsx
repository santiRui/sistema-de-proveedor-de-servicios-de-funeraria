"use client"

import { useEffect, useState } from "react"
import { ClientSidebar } from "@/components/client/sidebar"
import { SearchProviders } from "@/components/client/search-providers"
import { ProvidersList } from "@/components/client/providers-list"
import { MyQuotations } from "@/components/client/my-quotations"
import { MyContracts } from "@/components/client/my-contracts"
import { MyProfile } from "@/components/client/my-profile"

type Tab = "search" | "providers" | "quotations" | "contracts" | "profile"

interface ClientDashboardContentProps {
  user: any // Recibimos el usuario real desde el servidor
}

export function ClientDashboardContent({ user }: ClientDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("search")

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

  return (
    <div className="flex h-screen bg-background">
      <ClientSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
             <h1 className="text-2xl font-bold">Hola, {user.user_metadata?.full_name || user.email}</h1>
             <p className="text-muted-foreground">Bienvenido a tu panel de control</p>
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
