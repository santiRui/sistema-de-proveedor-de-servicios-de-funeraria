"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { verifyProvider, unverifyProvider } from "@/app/admin/actions"
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function ProviderDetailActions({ providerId, isVerified }: { providerId: string, isVerified: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleVerify = async () => {
    setIsLoading(true)
    await verifyProvider(providerId)
    setIsLoading(false)
    router.refresh()
  }

  const handleUnverify = async () => {
    setIsLoading(true)
    await unverifyProvider(providerId)
    setIsLoading(false)
    router.push('/admin/providers')
  }

  return (
    <div className="flex items-center gap-3">
      {isVerified ? (
        <Button
          variant="destructive"
          onClick={handleUnverify}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Revocar verificación
        </Button>
      ) : (
        <>
          <Button
            onClick={handleVerify}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Aprobar y verificar
          </Button>

          <Button
            variant="outline"
            onClick={handleUnverify}
            disabled={isLoading}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Rechazar proveedor
          </Button>
        </>
      )}
    </div>
  )
}
