"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageGallery } from "@/components/image-gallery"
import { Loader2, ArrowLeft, ExternalLink, Trash2, Home, MapPin, Calendar, Info } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface PropertyData {
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

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadProperty() {
      if (!user) return

      try {
        // Först försök att hämta från sessionStorage (om användaren kom från sparade fastigheter)
        const sessionProperty = sessionStorage.getItem("viewProperty")
        if (sessionProperty) {
          const parsedProperty = JSON.parse(sessionProperty)
          if (parsedProperty.id === params.id) {
            setProperty(parsedProperty)
            setIsLoading(false)
            return
          }
        }

        // Annars hämta från databasen
        const { data, error } = await supabase
          .from("saved_properties")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error("Fastigheten hittades inte")
        }

        setProperty(data)
      } catch (error: any) {
        console.error("Fel vid laddning av fastighet:", error)
        setError(error.message || "Kunde inte ladda fastighetsdetaljer")
      } finally {
        setIsLoading(false)
      }
    }

    loadProperty()
  }, [user, params.id])

  const handleDelete = async () => {
    if (!property || !user) return

    if (!confirm("Är du säker på att du vill ta bort denna fastighet från din sparade lista?")) {
      return
    }

    try {
      const { error } = await supabase.from("saved_properties").delete().eq("id", property.id).eq("user_id", user.id)

      if (error) {
        throw error
      }

      router.push("/saved")
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-10 px-4">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !property) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-10 px-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-md mb-4">{error || "Fastigheten hittades inte"}</div>
          <Link href="/saved">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till sparade fastigheter
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{property.title}</h1>
            <div className="flex items-center text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{property.location}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/saved">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <Button variant="outline" asChild>
              <a href={property.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visa original
              </a>
            </Button>
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Ta bort
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vänster kolumn - Bilder */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0] || "/placeholder.svg"}
                    alt={property.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = `/placeholder.svg?height=400&width=800&query=property`
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-200">
                    <Home className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Beskrivning</h3>
                  <p className="text-gray-700">{property.description}</p>
                </div>

                {property.features && property.features.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Egenskaper</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map((feature, index) => (
                        <Badge key={index} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Höger kolumn - Detaljer */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Fastighetsdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold mb-1">{formatCurrency(property.price)}</div>
                  {property.monthly_fee && <div className="text-sm text-gray-600">Avgift: {property.monthly_fee}</div>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Storlek</div>
                    <div className="font-medium">{property.size}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Rum</div>
                    <div className="font-medium">{property.rooms}</div>
                  </div>
                  {property.year_built && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Byggår</div>
                      <div className="font-medium">{property.year_built}</div>
                    </div>
                  )}
                  {property.energy_rating && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Energiklass</div>
                      <div className="font-medium">{property.energy_rating}</div>
                    </div>
                  )}
                </div>

                {property.agent && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
                    <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Mäklare</div>
                      <div className="font-medium">{property.agent}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Sparad</div>
                    <div className="font-medium">{new Date(property.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-medium mb-2">Fastighets-URL</h3>
                  <a
                    href={property.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {property.url}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bildgalleri */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Fastighetsbilder</CardTitle>
            <CardDescription>Alla bilder för denna fastighet ({property.images?.length || 0})</CardDescription>
          </CardHeader>
          <CardContent>
            {property.images && property.images.length > 0 ? (
              <ImageGallery images={property.images} websiteUrl={property.url} />
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-md">
                Inga bilder tillgängliga för denna fastighet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
