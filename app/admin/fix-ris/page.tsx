"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function FixRLSPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const fixRLSPolicies = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/fix-rls-policies", {
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

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Fixa RLS-policyer</CardTitle>
          <CardDescription>
            Använd denna funktion för att fixa Row Level Security-policyer för användarpreferenser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Detta kommer att skapa eller uppdatera RLS-policyer för tabellen user_property_requirements för att
            säkerställa att användare kan hantera sina egna preferenser.
          </p>
          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Framgång" : "Fel"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={fixRLSPolicies} disabled={isLoading}>
            {isLoading ? "Arbetar..." : "Fixa RLS-policyer"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
