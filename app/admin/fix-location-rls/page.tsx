// Add a button to create the stored procedure
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

export default function FixLocationRLSPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [functionLoading, setFunctionLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [functionResult, setFunctionResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleFixRLS = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-location-rls", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Ett fel inträffade: " + (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFunction = async () => {
    setFunctionLoading(true)
    setFunctionResult(null)

    try {
      const response = await fetch("/api/admin/create-location-function", {
        method: "POST",
      })

      const data = await response.json()
      setFunctionResult(data)
    } catch (error) {
      setFunctionResult({
        success: false,
        message: "Ett fel inträffade: " + (error as Error).message,
      })
    } finally {
      setFunctionLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto mb-6">
        <CardHeader>
          <CardTitle>Fixa RLS-policyer för platsönskemål</CardTitle>
          <CardDescription>
            Använd denna funktion för att åtgärda problem med Row-Level Security (RLS) för platsönskemål.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Framgång" : "Fel"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleFixRLS} disabled={isLoading} className="w-full">
            {isLoading ? "Åtgärdar..." : "Åtgärda RLS-policyer"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Skapa lagrad procedur för platsönskemål</CardTitle>
          <CardDescription>Skapa en lagrad procedur som kringgår RLS för att spara platsönskemål.</CardDescription>
        </CardHeader>
        <CardContent>
          {functionResult && (
            <Alert className={functionResult.success ? "bg-green-50" : "bg-red-50"}>
              {functionResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{functionResult.success ? "Framgång" : "Fel"}</AlertTitle>
              <AlertDescription>{functionResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreateFunction} disabled={functionLoading} className="w-full">
            {functionLoading ? "Skapar..." : "Skapa lagrad procedur"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
