"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Bug, Database, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface DebugPanelProps {
  propertyId?: string
}

export function DebugPanel({ propertyId }: DebugPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { user } = useAuth()
  const [result, setResult] = useState<string | null>(null)

  const checkDatabase = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = new URL("/api/debug-database", window.location.origin)
      if (propertyId) url.searchParams.append("propertyId", propertyId)
      if (user?.id) url.searchParams.append("userId", user.id)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to debug database")
      }

      setDebugData(data)
    } catch (err) {
      console.error("Debug error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const checkPropertyExists = async () => {
    if (!propertyId || !user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/property-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check property")
      }

      setDebugData((prev) => ({ ...prev, propertyExistsCheck: data }))
    } catch (err) {
      console.error("Property check error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateBrokerSchema = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/update-broker-schema", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update broker schema")
      }

      const result = await response.json()
      setResult(JSON.stringify(result, null, 2))
      alert("Broker schema updated successfully!")
    } catch (error) {
      console.error("Error updating broker schema:", error)
      setResult(JSON.stringify({ error: error.message }, null, 2))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-white"
        onClick={() => setIsVisible(!isVisible)}
      >
        <Bug className="h-4 w-4 mr-2" />
        Debug
      </Button>

      {isVisible && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
          <div className="max-w-2xl mx-auto my-8">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <Bug className="h-5 w-5 mr-2" />
                    Debug Panel
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                    Close
                  </Button>
                </div>
                <CardDescription>Diagnostic tools for troubleshooting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={checkDatabase} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Check Database
                      </>
                    )}
                  </Button>

                  {propertyId && (
                    <Button onClick={checkPropertyExists} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check Property
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Button onClick={updateBrokerSchema} disabled={isLoading} className="w-full" size="sm">
                  Update Broker Schema
                </Button>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

                {debugData && (
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[60vh]">
                    <pre className="text-xs">{JSON.stringify(debugData, null, 2)}</pre>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Session Information</h3>
                  <div className="text-sm">
                    <p>
                      <strong>User ID:</strong> {user?.id || "Not logged in"}
                    </p>
                    <p>
                      <strong>Property ID:</strong> {propertyId || "Not specified"}
                    </p>
                    <p>
                      <strong>Browser:</strong> {navigator.userAgent}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
