"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PropertyData } from "@/actions/crawler"
import { ImageGallery } from "./image-gallery"
import { ExternalLink, Info, Home, Database, Trash2, ChevronRight, BookmarkIcon, CheckIcon, Share2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ComparisonButton } from "@/components/comparison-button"
// Import the BrokerInfoCard component
import { BrokerInfoCard } from "@/components/broker-info-card"

// Update the PropertyResultsProps interface to include brokerInfo
interface PropertyResultsProps {
  results: {
    property: PropertyData
    images: string[]
    metadata: {
      crawledAt: string
      note?: string
      extractionMethod?: string
    }
    brokerInfo?: {
      name: string
      searchResults: any[]
      searchQuery: string
    }
  }
}

// Konstant för localStorage-nyckeln
const PENDING_PROPERTY_KEY = "realpal_pending_property"

export function PropertyResults({ results }: PropertyResultsProps) {
  const { property, images, metadata } = results
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Kontrollera om det finns en väntande fastighet att spara vid inloggning
  useEffect(() => {
    const checkPendingProperty = async () => {
      if (user) {
        const pendingPropertyJson = localStorage.getItem(PENDING_PROPERTY_KEY)
        if (pendingPropertyJson) {
          try {
            const pendingProperty = JSON.parse(pendingPropertyJson)

            // Visa bekräftelsedialog
            if (confirm("Vill du spara fastigheten du tittade på innan du loggade in?")) {
              setIsSaving(true)

              try {
                // Grundläggande fastighetsdata som alltid sparas
                const propertyData = {
                  user_id: user.id,
                  title: pendingProperty.property.title,
                  price: pendingProperty.property.price,
                  size: pendingProperty.property.size,
                  rooms: pendingProperty.property.rooms,
                  location: pendingProperty.property.location,
                  description: pendingProperty.property.description,
                  features: pendingProperty.images,
                  images: pendingProperty.images,
                  url: pendingProperty.property.url,
                  agent: pendingProperty.property.agent,
                  year_built: pendingProperty.property.yearBuilt,
                  monthly_fee: pendingProperty.property.monthlyFee,
                  energy_rating: pendingProperty.property.energyRating,
                }

                // Spara fastigheten utan analys
                const { error } = await supabase.from("saved_properties").insert([propertyData])

                if (error) {
                  throw error
                }

                alert("Fastigheten har sparats!")

                // Om den aktuella fastigheten är samma som den väntande, uppdatera UI
                if (pendingProperty.property.url === property.url) {
                  setSaved(true)
                }
              } catch (error) {
                console.error("Fel vid sparande av väntande fastighet:", error)
                alert("Kunde inte spara fastigheten. Försök igen.")
              } finally {
                setIsSaving(false)
              }
            }

            // Ta bort den väntande fastigheten oavsett
            localStorage.removeItem(PENDING_PROPERTY_KEY)
          } catch (error) {
            console.error("Fel vid tolkning av väntande fastighet:", error)
            localStorage.removeItem(PENDING_PROPERTY_KEY)
          }
        }
      }
    }

    checkPendingProperty()
  }, [user, property.url])

  // Kontrollera om fastigheten redan är sparad när komponenten laddas
  useEffect(() => {
    const checkIfSaved = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("saved_properties")
            .select("id")
            .eq("user_id", user.id)
            .eq("url", property.url)
            .maybeSingle()

          if (error) {
            throw error
          }

          setSaved(!!data)
        } catch (error) {
          console.error("Fel vid kontroll om fastigheten är sparad:", error)
        }
      }
    }

    checkIfSaved()
  }, [user, property.url])

  const formatCurrency = (price: string) => {
    // Try to extract numeric value and format it
    const numericValue = price.replace(/[^\d]/g, "")
    if (numericValue && !isNaN(Number(numericValue))) {
      return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(Number(numericValue))
    }
    return price
  }

  const handleSave = async () => {
    if (!user) {
      // Spara fastigheten i localStorage innan omdirigering till inloggning
      localStorage.setItem(
        PENDING_PROPERTY_KEY,
        JSON.stringify({
          property,
          images,
          metadata,
        }),
      )

      // Omdirigera till inloggningssidan
      router.push("/login?redirect=save")
      return
    }

    setIsSaving(true)
    try {
      if (saved) {
        // Find and delete the saved property
        const { data, error } = await supabase
          .from("saved_properties")
          .select("id")
          .eq("user_id", user.id)
          .eq("url", property.url)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          const { error: deleteError } = await supabase.from("saved_properties").delete().eq("id", data.id)

          if (deleteError) {
            throw deleteError
          }
        }

        setSaved(false)
      } else {
        // Grundläggande fastighetsdata som alltid sparas
        const propertyData = {
          user_id: user.id,
          title: property.title,
          price: property.price,
          size: property.size,
          rooms: property.rooms,
          location: property.location,
          description: property.description,
          features: property.features,
          images: images,
          url: property.url,
          agent: property.agent,
          year_built: property.yearBuilt,
          monthly_fee: property.monthlyFee,
          energy_rating: property.energyRating,
        }

        // Spara fastigheten utan analys
        const { error } = await supabase.from("saved_properties").insert([propertyData])

        if (error) {
          throw error
        }

        setSaved(true)
      }
    } catch (error) {
      console.error("Fel vid sparande av fastighet:", error)
      alert("Kunde inte spara fastigheten. Försök igen.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Kolla in denna fastighet: ${property.title}`,
        url: property.url,
      })
    } else {
      navigator.clipboard.writeText(property.url)
      alert("Länk kopierad till urklipp!")
    }
  }

  const viewPropertyDetails = (property: PropertyData) => {
    // Implement your logic to view property details here
    console.log("Viewing details for property:", property)
    // For example, you can navigate to a details page using router.push
    // router.push(`/property/${property.id}`);
  }

  const handleDelete = (propertyId: string) => {
    // Implement your logic to delete the property here
    console.log("Deleting property with ID:", propertyId)
    // For example, you can call an API to delete the property and then update the UI
  }

  return (
    <div className="space-y-6">
      {metadata.note && (
        <Alert variant="warning" className="border-0 shadow-sm">
          <Info className="h-4 w-4" />
          <AlertDescription>{metadata.note}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden shadow-lg border-0">
        <div className="relative aspect-video bg-gray-100">
          {images.length > 0 ? (
            <img
              src={images[0] || "/placeholder.svg"}
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

        <CardHeader className="pb-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{property.title}</CardTitle>
              <CardDescription className="text-lg">{property.location}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(property.price)}</div>
              {property.monthlyFee && <div className="text-sm text-gray-500">Avgift: {property.monthlyFee}</div>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Storlek</div>
              <div className="font-medium">{property.size}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Rum</div>
              <div className="font-medium">{property.rooms}</div>
            </div>
            {property.yearBuilt && (
              <div className="bg-gray-50 p-3 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500">Byggår</div>
                <div className="font-medium">{property.yearBuilt}</div>
              </div>
            )}
            {property.energyRating && (
              <div className="bg-gray-50 p-3 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500">Energiklass</div>
                <div className="font-medium">{property.energyRating}</div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Beskrivning</h3>
            <p className="text-gray-700">{property.description}</p>
          </div>

          {property.features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Egenskaper</h3>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="shadow-sm">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {property.agent && <div className="text-sm text-gray-500 mt-4">Mäklare: {property.agent}</div>}
          {results.brokerInfo && results.brokerInfo.searchResults && results.brokerInfo.searchResults.length > 0 && (
            <div className="mt-4">
              <BrokerInfoCard brokerName={results.brokerInfo.name} searchResults={results.brokerInfo.searchResults} />
            </div>
          )}

          {metadata.extractionMethod && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <Database className="h-3 w-3" />
              Datahämtning: {metadata.extractionMethod}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-4 border-t flex flex-col space-y-3">
          <div className="grid grid-cols-2 w-full gap-2">
            <Button
              variant={saved ? "outline" : "default"}
              size="sm"
              className="flex items-center justify-center"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                "Sparar..."
              ) : saved ? (
                <>
                  <CheckIcon className="h-4 w-4 mr-1.5" />
                  <span className="truncate">Sparad</span>
                </>
              ) : (
                <>
                  <BookmarkIcon className="h-4 w-4 mr-1.5" />
                  <span className="truncate">Spara</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" className="flex items-center justify-center" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="truncate">Dela</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center"
              onClick={() => viewPropertyDetails(property)}
            >
              <ChevronRight className="h-4 w-4 mr-1.5" />
              <span className="truncate">Detaljer</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center justify-center" asChild>
              <a href={property.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                <span className="truncate">Original</span>
              </a>
            </Button>

            <ComparisonButton property={property} className="flex items-center justify-center" />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center"
              onClick={() => handleDelete(property.id)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              <span className="truncate">Ta bort</span>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Tabs defaultValue="images" className="mt-8">
        <TabsList className="grid grid-cols-2 w-full max-w-full overflow-x-auto">
          <TabsTrigger value="images" className="min-w-[100px]">
            Bilder ({images.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="min-w-[100px]">
            Ytterligare detaljer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Fastighetsbilder</CardTitle>
            </CardHeader>
            <CardContent>
              {images.length > 0 ? (
                <ImageGallery images={images} websiteUrl={property.url} />
              ) : (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-md">
                  Inga bilder tillgängliga för denna fastighet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Ytterligare information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Fastighets-URL</h3>
                <a
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {property.url}
                </a>
              </div>
              <div>
                <h3 className="font-medium">Data hämtad</h3>
                <p>{new Date(metadata.crawledAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
