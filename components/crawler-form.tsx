"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PropertyResults } from "./property-results"
import { Loader2, Search } from "lucide-react"
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
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">Fastighetsanalys</CardTitle>
          <CardDescription>Analysera och spara fastighetsannonser från webben</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
            <Search className="h-4 w-4" />
            <AlertDescription>
              Klistra in en URL till en fastighetsannons från Hemnet, Booli eller andra fastighetswebbplatser för att
              analysera och spara den.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                URL till fastighetsannons
              </label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.hemnet.se/bostad/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full shadow-sm"
                />
                <Button type="submit" disabled={isLoading} className="px-6">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hämtar...
                    </>
                  ) : (
                    "Hämta"
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Prova URL:er från Hemnet, Booli eller andra fastighetswebbplatser</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

      {results && <PropertyResults results={results} />}
    </div>
  )
}
