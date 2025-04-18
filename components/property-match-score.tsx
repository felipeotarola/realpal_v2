"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type PropertyMatchResult, getMatchQualityDescription } from "@/lib/property-scoring"
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react"

interface PropertyMatchScoreProps {
  matchResult: PropertyMatchResult
  propertyTitle: string
}

export function PropertyMatchScore({ matchResult, propertyTitle }: PropertyMatchScoreProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { percentage, matches } = matchResult

  // Determine color based on match percentage
  const getColorClass = (percent: number) => {
    if (percent >= 80) return "bg-green-500"
    if (percent >= 60) return "bg-blue-500"
    if (percent >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Sort matches by importance (highest first)
  const sortedMatches = Object.entries(matches).sort(([, a], [, b]) => b.importance - a.importance)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Matchning med dina preferenser</CardTitle>
        <CardDescription>{propertyTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">{getMatchQualityDescription(percentage)}</span>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className={getColorClass(percentage)} />
        </div>

        {showDetails && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium mb-2">Detaljer</h4>
            <div className="space-y-2">
              {sortedMatches.map(([featureId, { matched, importance, featureLabel }]) => (
                <div key={featureId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {matched ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span>{featureLabel}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      importance === 4
                        ? "border-red-500 text-red-700"
                        : importance === 3
                          ? "border-orange-500 text-orange-700"
                          : importance === 2
                            ? "border-blue-500 text-blue-700"
                            : importance === 1
                              ? "border-green-500 text-green-700"
                              : "border-gray-300 text-gray-500"
                    }
                  >
                    {importance === 4
                      ? "Måste ha"
                      : importance === 3
                        ? "Mycket viktigt"
                        : importance === 2
                          ? "Ganska viktigt"
                          : importance === 1
                            ? "Trevligt att ha"
                            : "Inte viktigt"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Dölj detaljer
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Visa detaljer
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
