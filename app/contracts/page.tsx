"use client"

import { useAuthStore } from "@/lib/store/auth-store"
import { ContractManager } from "@/components/contracts/contract-manager"

export default function ContractsPage() {
  const { user } = useAuthStore()

  if (!user) {
    return <div className="p-8 text-center">No autorizado</div>
  }

  return <ContractManager />
}
