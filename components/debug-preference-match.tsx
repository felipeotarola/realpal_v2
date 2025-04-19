"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { PreferenceMatchCard } from "./preference-match-card"

interface DebugPreferenceMatchProps {
  propertyId: string
}

export function DebugPreferenceMatch({ propertyId }: DebugPreferenceMatchProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const calculateMatch = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/calculate-preference-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to calculate preference match")
      }

      const data = await response.json()
      console.log("Debug preference match result:", data)
      setResult(data)
    } catch (err) {
      console.error("Error calculating preference match:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6 border-dashed border-yellow-300 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">Debug: Preference Match</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={calculateMatch} disabled={loading} variant="outline" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Preference Match"
            )}
          </Button>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md">{error}</div>}

          {result && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-md">
                <p>
                  <strong>Match Score:</strong> {result.matchResult.score} / {result.matchResult.maxScore}
                </p>
                <p>
                  <strong>Match Percentage:</strong> {result.matchResult.percentage}%
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Property Features:</h4>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(result.propertyFeatures, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">User Preferences:</h4>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(result.userPreferences, null, 2)}
                </pre>
              </div>

              {result.matchResult && result.matchResult.matches && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="border p-4 rounded-md">
                    <PreferenceMatchCard
                      score={result.matchResult.score}
                      percentage={result.matchResult.percentage}
                      matches={result.matchResult.matches}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
