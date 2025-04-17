"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function UpdateDatabasePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const updateDatabase = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/update-database")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ett fel uppstod")
      }

      setResult(data)
    } catch (err) {
      console.error("Error updating database:", err)
      setError(err instanceof Error ? err.message : "Ett fel uppstod")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Uppdatera databas</CardTitle>
            <CardDescription>
              Lägg till nya kolumner för fastighetsanalys i databasen. Detta behöver bara göras en gång.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            {result && result.addedColumns && result.addedColumns.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Tillagda kolumner:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {result.addedColumns.map((column: string, index: number) => (
                    <li key={index} className="text-sm">
                      {column}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={updateDatabase} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uppdaterar databas...
                </>
              ) : (
                "Uppdatera databas"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
