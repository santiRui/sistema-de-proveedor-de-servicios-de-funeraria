"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CoverageAccordionProps {
  groupedAreas: Record<string, string[]>
}

export function CoverageAccordion({ groupedAreas }: CoverageAccordionProps) {
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null)

  const entries = Object.entries(groupedAreas).filter(([, depts]) => depts.length > 0)
  if (entries.length === 0) return null

  const toggleProvince = (province: string) => {
    setExpandedProvince((prev) => (prev === province ? null : province))
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Áreas de Cobertura</h3>
      <p className="text-xs text-muted-foreground">
        Solo se muestran las provincias donde este plan tiene al menos un departamento cubierto.
      </p>
      <div className="max-h-72 overflow-y-auto pr-1 border rounded-md bg-gray-50 p-3 space-y-2">
        {entries.map(([province, depts]) => {
          const isExpanded = expandedProvince === province
          return (
            <div key={province} className="border rounded bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleProvince(province)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900">{province}</span>
                  <span className="text-[11px] text-gray-500">{depts.length} deptos</span>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-3">
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                    {depts.map((dept) => (
                      <li key={dept}>{dept}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
