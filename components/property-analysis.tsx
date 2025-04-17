"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BarChart2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PropertyAnalysisProps {
  propertyId: string
  userId: string
}

export function PropertyAnalysis({ propertyId, userId }: PropertyAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze-saved-property", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ propertyId, userId }),
      })

      console.log("API response:", response)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kunde inte analysera fastigheten")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      console.error("Fel vid analys av fastighet:", err)
      setError(err instanceof Error ? err.message : "Kunde inte analysera fastigheten")
    } finally {
      setIsLoading(false)
    }
  }

  // Simple markdown to HTML converter
  function markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, "<h3 class='text-lg font-medium mt-4 mb-2'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='text-xl font-semibold mt-5 mb-3'>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-6 mb-4'>$1</h1>")
      .replace(/^> (.*$)/gim, "<blockquote class='pl-4 border-l-4 border-gray-200 italic my-3'>$1</blockquote>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/!\[(.*?)\]$$(.*?)$$/gim, '<img alt="$1" src="$2" class="my-3 rounded" />')
      .replace(/\[(.*?)\]$$(.*?)$$/gim, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
      .replace(/\n$/gim, "<br />")
      .replace(/^\s*\n/gm, "<br />")
      .replace(/^\s*(-|\*)\s(.*)/gim, "<ul class='list-disc pl-5 my-2'><li>$2</li></ul>")
      .replace(/^\s*(\d+\.)\s(.*)/gim, "<ol class='list-decimal pl-5 my-2'><li>$2</li></ol>")
      .replace(/<\/ul>\s*<ul>/gim, "")
      .replace(/<\/ol>\s*<ol>/gim, "")
      .replace(/```([\s\S]*?)```/gim, "<pre class='bg-gray-100 p-3 rounded my-3'><code>$1</code></pre>")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-analys av fastigheten</CardTitle>
        <CardDescription>Få en detaljerad analys av fastigheten baserad på tillgänglig information</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!analysis && !isLoading && (
          <div className="text-center py-6">
            <BarChart2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Generera en AI-analys för att få insikter om denna fastighet</p>
            <Button onClick={generateAnalysis}>Generera analys</Button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Analyserar fastigheten...</p>
            <p className="text-xs text-gray-400 mt-2">Detta kan ta upp till 30 sekunder</p>
          </div>
        )}

        {analysis && (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(analysis) }} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
