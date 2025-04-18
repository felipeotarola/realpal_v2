"use client"

import { Button } from "@/components/ui/button"
import { useComparison } from "@/contexts/comparison-context"
import { BarChart2, Check } from "lucide-react"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ComparisonButtonProps {
  property: any
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ComparisonButton({
  property,
  variant = "outline",
  size = "sm",
  className = "",
}: ComparisonButtonProps) {
  const { addProperty, removeProperty, isSelected } = useComparison()
  const [showTooltip, setShowTooltip] = useState(false)

  const selected = isSelected(property.id)

  const handleClick = () => {
    if (selected) {
      removeProperty(property.id)
    } else {
      addProperty(property)

      // Show tooltip briefly
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 2000)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <Button
            variant={selected ? "default" : variant}
            size={size}
            onClick={handleClick}
            className={`${selected ? "bg-green-600 hover:bg-green-700" : ""} ${className}`}
          >
            {selected ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Vald för jämförelse
              </>
            ) : (
              <>
                <BarChart2 className="h-4 w-4 mr-2" />
                Jämför
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fastighet tillagd för jämförelse!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
