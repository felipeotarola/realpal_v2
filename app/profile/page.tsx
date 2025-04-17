"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string
  email: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      try {
        console.log("Loading profile for user:", user.id)
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) {
          console.error("Error loading profile:", error)
          throw error
        }

        console.log("Profile loaded:", data)
        setProfile(data)
        setUsername(data.username || "")
        setFullName(data.full_name || "")
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        throw error
      }

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Ett fel uppstod när din profil skulle uppdateras")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Din Profil</h1>

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Profilinformation</CardTitle>
                <CardDescription>Uppdatera dina kontouppgifter</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Din profil har uppdaterats.</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      E-post
                    </label>
                    <Input id="email" type="email" value={user?.email || ""} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">Din e-post kan inte ändras</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">
                      Användarnamn
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      Fullständigt namn
                    </label>
                    <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      "Spara ändringar"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
