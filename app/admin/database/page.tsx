"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export default function DatabaseAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [sqlResult, setSqlResult] = useState<string | null>(null)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [sqlQuery, setSqlQuery] = useState<string>(
    "-- Skriv din SQL-fråga här\nSELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
  )
  const { user } = useAuth()

  const createTables = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/create-tables", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ett fel uppstod")
      }

      setResult(data)
    } catch (err) {
      console.error("Error creating tables:", err)
      setError(err instanceof Error ? err.message : "Ett fel uppstod")
    } finally {
      setIsLoading(false)
    }
  }

  const migrateData = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/migrate-data", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ett fel uppstod")
      }

      setResult(data)
    } catch (err) {
      console.error("Error migrating data:", err)
      setError(err instanceof Error ? err.message : "Ett fel uppstod")
    } finally {
      setIsLoading(false)
    }
  }

  const executeSql = async () => {
    setIsLoading(true)
    setSqlError(null)
    setSqlResult(null)

    try {
      const response = await fetch("/api/admin/execute-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql: sqlQuery }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ett fel uppstod")
      }

      setSqlResult(JSON.stringify(data.result, null, 2))
    } catch (err) {
      console.error("Error executing SQL:", err)
      setSqlError(err instanceof Error ? err.message : "Ett fel uppstod")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Database className="mr-2 h-8 w-8" />
          Databasadministration
        </h1>
        <p className="text-gray-500 mb-8">Hantera databastabeller och migrering av data</p>

        <Tabs defaultValue="tables">
          <TabsList className="mb-6">
            <TabsTrigger value="tables">Skapa tabeller</TabsTrigger>
            <TabsTrigger value="migrate">Migrera data</TabsTrigger>
            <TabsTrigger value="sql">Kör SQL</TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle>Skapa nya tabeller</CardTitle>
                <CardDescription>
                  Skapa property_analyses-tabellen och uppdatera saved_properties med is_analyzed-flagga
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

                <Button onClick={createTables} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skapar tabeller...
                    </>
                  ) : (
                    "Skapa tabeller"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="migrate">
            <Card>
              <CardHeader>
                <CardTitle>Migrera analysdata</CardTitle>
                <CardDescription>
                  Flytta befintlig analysdata från saved_properties till property_analyses
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

                <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 mb-4">
                  <p className="font-medium">Varning!</p>
                  <p>
                    Denna åtgärd kommer att migrera all analysdata från saved_properties till property_analyses. Se till
                    att du har skapat tabellerna först.
                  </p>
                </div>

                <Button onClick={migrateData} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrerar data...
                    </>
                  ) : (
                    "Migrera data"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sql">
            <Card>
              <CardHeader>
                <CardTitle>Kör SQL-frågor</CardTitle>
                <CardDescription>Kör anpassade SQL-frågor mot databasen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono min-h-[200px]"
                  placeholder="SELECT * FROM saved_properties LIMIT 10;"
                />

                {sqlError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sqlError}</AlertDescription>
                  </Alert>
                )}

                {sqlResult && (
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[400px]">
                    <pre className="text-sm font-mono">{sqlResult}</pre>
                  </div>
                )}

                <Button onClick={executeSql} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kör SQL...
                    </>
                  ) : (
                    "Kör SQL"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
