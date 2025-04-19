"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { searchBrokerInfo } from "@/lib/tavily-search"
import { Input } from "@/components/ui/input"

interface DebugBrokerSearchProps {
  brokerName: string
  location?: string
}

export function DebugBrokerSearch({ brokerName, location }: DebugBrokerSearchProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [customBrokerName, setCustomBrokerName] = useState(brokerName)
  const [customLocation, setCustomLocation] = useState(location || "")

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(
        `🔍 Debug: Manually searching for broker: "${customBrokerName}" in location: "${customLocation || "not specified"}"`,
      )

      const searchResults = await searchBrokerInfo(customBrokerName, customLocation || undefined)

      console.log("🔍 Debug: Search results:", searchResults)
      setResults(searchResults)

      if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
        setError("No results found")
      }
    } catch (err) {
      console.error("🔍 Debug: Error searching for broker:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Debug Broker Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Broker Name:</label>
              <Input value={customBrokerName} onChange={(e) => setCustomBrokerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Location:</label>
              <Input
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading} size="sm" variant="outline" className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              "Test Broker Search"
            )}
          </Button>

          {error && <div className="text-sm text-red-500 mt-2">Error: {error}</div>}

          {results && (
            <div className="mt-4 text-xs">
              <div className="font-medium">Search Query:</div>
              <div className="bg-gray-100 p-2 rounded mt-1 mb-2 overflow-x-auto">{results.searchQuery}</div>

              <div className="font-medium">Results ({results.results?.length || 0}):</div>
              {results.results && results.results.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {results.results.slice(0, 3).map((result: any, index: number) => (
                    <div key={index} className="bg-gray-100 p-2 rounded">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-blue-600 text-xs truncate">{result.url}</div>
                      <div className="mt-1">{result.content.substring(0, 150)}...</div>
                    </div>
                  ))}
                  {results.results.length > 3 && (
                    <div className="text-center text-gray-500">+ {results.results.length - 3} more results</div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 p-2 rounded mt-1 text-gray-500">No results found</div>
              )}

              <div className="mt-4">
                <div className="font-medium">Raw Response:</div>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto max-h-40 text-xs">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
