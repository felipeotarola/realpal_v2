"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PropertyResults } from "./property-results"
import { Loader2, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CrawlerForm() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validera URL
      try {
        new URL(url) // Detta kommer att kasta ett fel om URL:en är ogiltig
      } catch (urlError) {
        throw new Error("Vänligen ange en giltig URL för fastighetsannonsen inklusive http:// eller https://")
      }

      // Anropa vår nya API-route istället för server action
      const response = await fetch("/api/crawler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kunde inte hämta fastighetsdetaljer")
      }

      const data = await response.json()
      console.log("Crawler response:", data) // Lägg till felsökning
      setResults(data)
    } catch (err) {
      console.error("Fel vid hämtning av fastighet:", err)
      setError(err instanceof Error ? err.message : "Kunde inte hämta fastighetsdetaljer")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>RealPal</CardTitle>
          <CardDescription>Ange en URL till en fastighetsannons för att hämta och spara detaljer</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Home className="h-4 w-4" />
            <AlertDescription>
              Fungerar med de flesta fastighetsannonswebbplatser. Ange URL:en till en lägenhet eller husannons du är
              intresserad av.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                URL till fastighetsannons
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.hemnet.se/bostad/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500">Prova URL:er från Hemnet, Booli eller andra fastighetswebbplatser</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Hämtar fastighetsdetaljer...
                </>
              ) : (
                "Hämta fastighetsdetaljer"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

      {results && <PropertyResults results={results} />}
    </div>
  )
}
