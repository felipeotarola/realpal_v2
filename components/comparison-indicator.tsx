"use client"

import { useComparison } from "@/contexts/comparison-context"
import { Button } from "@/components/ui/button"
import { BarChart2, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function ComparisonIndicator() {
  const { selectedProperties, clearComparison } = useComparison()
  const pathname = usePathname()

  // Don't show on the comparison page itself
  if (pathname === "/compare") return null

  // Don't show if no properties are selected
  if (selectedProperties.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-3">
      <div className="flex items-center">
        <BarChart2 className="h-5 w-5 mr-2 text-green-600" />
        <span className="font-medium">{selectedProperties.length} fastigheter valda</span>
      </div>

      <Link href="/compare">
        <Button size="sm">Jämför nu</Button>
      </Link>

      <Button variant="ghost" size="sm" onClick={clearComparison} className="ml-2">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
