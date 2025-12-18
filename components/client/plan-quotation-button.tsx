"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { QuotationModal } from "./quotation-modal"

interface PlanQuotationButtonProps {
  providerId: string
  serviceId?: string
  serviceName?: string
}

export function PlanQuotationButton({ providerId, serviceId, serviceName }: PlanQuotationButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button className="mt-2" onClick={() => setOpen(true)}>
        Solicitar cotización
      </Button>

      <QuotationModal
        providerId={providerId}
        serviceId={serviceId}
        serviceName={serviceName}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
