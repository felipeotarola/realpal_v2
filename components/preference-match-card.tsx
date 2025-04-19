"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Check, X } from "lucide-react"

interface PreferenceMatchProps {
  score: number
  percentage: number
  matches: Record<string, { matched: boolean; importance: number; featureLabel: string }>
}

export function PreferenceMatchCard({ score, percentage, matches }: PreferenceMatchProps) {
  const [expanded, setExpanded] = useState(false)

  // Group matches by importance and match status
  const matchedByImportance = {
    mustHave: [] as string[],
    veryImportant: [] as string[],
    other: [] as string[],
  }

  const unmatchedByImportance = {
    mustHave: [] as string[],
    veryImportant: [] as string[],
    other: [] as string[],
  }

  Object.entries(matches).forEach(([_, { matched, importance, featureLabel }]) => {
    if (matched) {
      if (importance === 4) matchedByImportance.mustHave.push(featureLabel)
      else if (importance === 3) matchedByImportance.veryImportant.push(featureLabel)
      else if (importance > 0) matchedByImportance.other.push(featureLabel)
    } else {
      if (importance === 4) unmatchedByImportance.mustHave.push(featureLabel)
      else if (importance === 3) unmatchedByImportance.veryImportant.push(featureLabel)
      else if (importance > 0) unmatchedByImportance.other.push(featureLabel)
    }
  })

  // Determine color based on match percentage
  const getColorClass = () => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Determine description based on match percentage
  const getMatchDescription = () => {
    if (percentage >= 90) return "Perfekt matchning"
    if (percentage >= 80) return "Utmärkt matchning"
    if (percentage >= 70) return "Mycket bra matchning"
    if (percentage >= 60) return "Bra matchning"
    if (percentage >= 50) return "Acceptabel matchning"
    if (percentage >= 40) return "Hyfsad matchning"
    if (percentage >= 30) return "Dålig matchning"
    return "Mycket dålig matchning"
  }

  return (
    <div className="w-full">
      <div className="text-lg font-medium mb-2">{getMatchDescription()}</div>
      <div className="flex items-center justify-between mb-2">
        <span>Matchning med dina preferenser</span>
        <span className={`px-2 py-1 rounded-full text-white text-sm ${getColorClass()}`}>{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2 mb-4" />

      <Button
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <span>Visa mindre</span>
            <ChevronUp size={16} />
          </>
        ) : (
          <>
            <span>Visa detaljer</span>
            <ChevronDown size={16} />
          </>
        )}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {unmatchedByImportance.mustHave.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600">Saknade måste-ha krav:</h4>
              <ul className="space-y-1">
                {unmatchedByImportance.mustHave.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <X size={16} className="text-red-500" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matchedByImportance.mustHave.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Uppfyllda måste-ha krav:</h4>
              <ul className="space-y-1">
                {matchedByImportance.mustHave.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-500" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unmatchedByImportance.veryImportant.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-600">Saknade mycket viktiga krav:</h4>
              <ul className="space-y-1">
                {unmatchedByImportance.veryImportant.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <X size={16} className="text-amber-500" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matchedByImportance.veryImportant.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Uppfyllda mycket viktiga krav:</h4>
              <ul className="space-y-1">
                {matchedByImportance.veryImportant.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-500" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(matchedByImportance.other.length > 0 || unmatchedByImportance.other.length > 0) && (
            <div className="space-y-2">
              <h4 className="font-semibold">Övriga preferenser:</h4>
              <ul className="space-y-1">
                {matchedByImportance.other.map((label, i) => (
                  <li key={`matched-${i}`} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-500" />
                    <span>{label}</span>
                  </li>
                ))}
                {unmatchedByImportance.other.map((label, i) => (
                  <li key={`unmatched-${i}`} className="flex items-center gap-2 text-sm">
                    <X size={16} className="text-gray-500" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
