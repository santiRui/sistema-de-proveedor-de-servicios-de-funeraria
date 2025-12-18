"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { verifyProvider, unverifyProvider } from "@/app/admin/actions"
import { CheckCircle, XCircle, Loader2, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function ProviderActions({ providerId, isVerified }: { providerId: string, isVerified: boolean }) {
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
     router.refresh()
  }

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link href={`/admin/providers/${providerId}`}>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          <Eye className="h-4 w-4 mr-1" />
          Revisar
        </Button>
      </Link>

      {isVerified ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnverify}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Suspender
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            onClick={handleVerify}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Verificar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleUnverify}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rechazar
          </Button>
        </>
      )}
    </div>
  )
}
