import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CAPITAL_CITY_BY_PROVINCE, DEPARTMENTS_BY_PROVINCE } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function canonicalizeDepartment(province: string, department: string) {
  const prov = (province || "").trim()
  const dept = (department || "").trim()
  if (!prov || !dept) return dept

  if (dept === "Capital") {
    return CAPITAL_CITY_BY_PROVINCE[prov] || dept
  }

  return dept
}

export function getDepartmentAliases(province: string, department: string) {
  const prov = (province || "").trim()
  const dept = (department || "").trim()
  const aliases = new Set<string>()
  if (!dept) return aliases

  aliases.add(dept)

  const capitalCity = CAPITAL_CITY_BY_PROVINCE[prov]
  if (!capitalCity) return aliases

  if (dept === "Capital") {
    aliases.add(capitalCity)
  } else if (dept === capitalCity) {
    aliases.add("Capital")
  }

  return aliases
}

export function summarizeServiceAreas(areas: string[]) {
  const byProvince = new Map<string, Set<string>>()
  const customAreas: string[] = []

  for (const raw of areas || []) {
    if (typeof raw !== "string") continue
    const area = raw.trim()
    if (!area) continue

    const idx = area.indexOf(":")
    if (idx <= 0) {
      customAreas.push(area)
      continue
    }

    const province = area.slice(0, idx).trim()
    const dept = area.slice(idx + 1).trim()
    if (!province || !dept) {
      customAreas.push(area)
      continue
    }

    if (!byProvince.has(province)) byProvince.set(province, new Set())
    byProvince.get(province)!.add(dept)
  }

  const result: string[] = []

  for (const [province, deptsSet] of byProvince.entries()) {
    const allDepts = DEPARTMENTS_BY_PROVINCE[province]
    if (Array.isArray(allDepts) && allDepts.length > 0) {
      const capitalCity = CAPITAL_CITY_BY_PROVINCE[province]
      const selected = allDepts.filter((d) => {
        if (deptsSet.has(d)) return true
        if (capitalCity && d === capitalCity && deptsSet.has("Capital")) return true
        return false
      })
      if (selected.length === allDepts.length) {
        result.push(province)
      } else {
        result.push(...selected.map((d) => `${province}: ${d}`))
        const unknown = Array.from(deptsSet)
          .filter((d) => {
            if (allDepts.includes(d)) return false
            if (capitalCity && d === "Capital" && allDepts.includes(capitalCity)) return false
            return true
          })
          .sort()
        result.push(...unknown.map((d) => `${province}: ${canonicalizeDepartment(province, d)}`))
      }
    } else {
      const selected = Array.from(deptsSet).sort()
      result.push(...selected.map((d) => `${province}: ${canonicalizeDepartment(province, d)}`))
    }
  }

  result.push(...customAreas)
  return result
}
