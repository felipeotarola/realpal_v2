"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Home, Trash2, ExternalLink } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface SavedProperty {
  id: string
  user_id: string
  title: string
  price: string
  size: string
  rooms: string
  location: string
  description: string
  features: string[]
  images: string[]
  url: string
  agent?: string
  year_built?: string
  monthly_fee?: string
  energy_rating?: string
  created_at: string
}

export default function SavedPropertiesPage() {
  const { user } = useAuth()
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSavedProperties() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("saved_properties")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setSavedProperties(data || [])
      } catch (error: any) {
        console.error("Fel vid laddning av sparade fastigheter:", error)
        setError(error.message || "Kunde inte ladda sparade fastigheter")
      } finally {
        setIsLoading(false)
      }
    }

    loadSavedProperties()
  }, [user])

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna fastighet från din sparade lista?")) {
      return
    }

    try {
      const { error } = await supabase.from("saved_properties").delete().eq("id", id).eq("user_id", user?.id)

      if (error) {
        throw error
      }

      setSavedProperties(savedProperties.filter((property) => property.id !== id))
    } catch (error: any) {
      console.error("Fel vid borttagning av fastighet:", error)
      alert("Kunde inte ta bort fastighet: " + error.message)
    }
  }

  const formatCurrency = (price: string) => {
    // Try to extract numeric value and format it
    const numericValue = price.replace(/[^\d]/g, "")
    if (numericValue && !isNaN(Number(numericValue))) {
      return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(Number(numericValue))
    }
    return price
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-2">Sparade Fastigheter</h1>
        <p className="text-gray-500 mb-8">Fastigheter du har sparat för senare</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>
        ) : savedProperties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Inga sparade fastigheter ännu</h2>
            <p className="text-gray-500 mb-4">Börja bläddra och spara fastigheter du är intresserad av</p>
            <Link href="/">
              <Button>Bläddra bland fastigheter</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden flex flex-col h-full">
                <div className="relative aspect-video bg-gray-100">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0] || "/placeholder.svg"}
                      alt={property.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = `/placeholder.svg?height=200&width=400&query=property`
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <Home className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                  <CardDescription className="line-clamp-1">{property.location}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2 flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold">{formatCurrency(property.price)}</div>
                    <div className="text-sm text-gray-500">
                      {property.size} • {property.rooms}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">{property.description}</p>
                  {property.features && property.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {property.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {property.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{property.features.length - 3} mer
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleDelete(property.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Ta bort
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={property.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visa
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
