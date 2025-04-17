"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Home, Trash2, ExternalLink, ChevronRight, MapPin, Star, Brain } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"

interface AttributeScore {
  name: string
  score: number
  comment: string
}

interface PropertyAnalysis {
  id: string
  property_id: string
  analysis_summary: string
  total_score: number
  attribute_scores: AttributeScore[]
  pros: string[]
  cons: string[]
  investment_rating: number
  value_for_money: number
  created_at: string
  updated_at: string
}

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
  is_analyzed: boolean
  analysis?: PropertyAnalysis | null
}

export default function SavedPropertiesPage() {
  const { user } = useAuth()
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[] | null>(null)
  const [dialogTitle, setDialogTitle] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function loadSavedProperties() {
      if (!user) return

      try {
        // Hämta alla sparade fastigheter
        const { data: properties, error } = await supabase
          .from("saved_properties")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        // För fastigheter som är analyserade, hämta analysdata
        const propertiesWithAnalysis = await Promise.all(
          (properties || []).map(async (property) => {
            if (property.is_analyzed) {
              const { data: analysis, error: analysisError } = await supabase
                .from("property_analyses")
                .select("*")
                .eq("property_id", property.id)
                .single()

              if (analysisError) {
                console.error("Fel vid hämtning av analys för fastighet:", property.id, analysisError)
                return { ...property, analysis: null }
              }

              return { ...property, analysis }
            }
            return { ...property, analysis: null }
          }),
        )

        setSavedProperties(propertiesWithAnalysis || [])
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

  const showAllFeatures = (features: string[], title: string) => {
    setSelectedFeatures(features)
    setDialogTitle(title)
  }

  const viewPropertyDetails = (property: SavedProperty) => {
    // Spara fastigheten i sessionStorage för att visa detaljer på detaljsidan
    sessionStorage.setItem("viewProperty", JSON.stringify(property))
    router.push(`/property/${property.id}`)
  }

  // Funktion för att visa poängfärg baserat på värde
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600"
    if (score >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  // Funktion för att visa poängbakgrundsfärg baserat på värde
  const getScoreBackgroundColor = (score: number) => {
    if (score >= 8) return "bg-green-100"
    if (score >= 6) return "bg-yellow-100"
    return "bg-red-100"
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
                {/* Bild */}
                <div
                  className="relative aspect-video bg-gray-100 cursor-pointer"
                  onClick={() => viewPropertyDetails(property)}
                >
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

                  {/* Visa totalpoäng om tillgängligt */}
                  {property.analysis && property.analysis.total_score && (
                    <div
                      className={`absolute top-2 right-2 ${getScoreBackgroundColor(property.analysis.total_score)} rounded-full p-1 px-2 font-bold text-sm flex items-center`}
                    >
                      <Star className="h-3.5 w-3.5 mr-1 text-yellow-500 fill-yellow-500" />
                      <span className={getScoreColor(property.analysis.total_score)}>
                        {property.analysis.total_score.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Visa analysikon om fastigheten inte är analyserad */}
                  {!property.is_analyzed && (
                    <div className="absolute top-2 right-2 bg-gray-100 rounded-full p-1 px-2 text-sm flex items-center">
                      <Brain className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Rubrik och plats */}
                <CardHeader className="pb-2 cursor-pointer" onClick={() => viewPropertyDetails(property)}>
                  <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                  <CardDescription className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">{property.location}</span>
                  </CardDescription>
                </CardHeader>

                {/* Huvudinnehåll */}
                <CardContent className="pb-2 flex-grow space-y-4">
                  {/* Pris och storlek */}
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-lg">{formatCurrency(property.price)}</div>
                    <div className="text-sm bg-gray-100 px-2 py-1 rounded-md">
                      {property.size} • {property.rooms}
                    </div>
                  </div>

                  {/* AI-analys och sammanfattning */}
                  {property.analysis && property.analysis.analysis_summary && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700">{property.analysis.analysis_summary}</p>
                    </div>
                  )}

                  {/* Visa topp 3 attribut om tillgängligt */}
                  {property.analysis &&
                    property.analysis.attribute_scores &&
                    property.analysis.attribute_scores.length > 0 && (
                      <div className="space-y-2">
                        {property.analysis.attribute_scores
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 3)
                          .map((attr, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="capitalize">{attr.name}</span>
                              <div className="flex items-center gap-2 w-1/2">
                                <Progress value={attr.score * 10} className="h-1.5" />
                                <span className={getScoreColor(attr.score)}>{attr.score}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Egenskaper/badges */}
                  {property.features && property.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {property.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {property.features.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-gray-100"
                          onClick={() => showAllFeatures(property.features, property.title)}
                        >
                          +{property.features.length - 3} mer
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                {/* Knappar */}
                <CardFooter className="pt-4 border-t flex flex-col space-y-3">
                  <div className="flex justify-between w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-[48%]"
                      onClick={() => viewPropertyDetails(property)}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Visa detaljer
                    </Button>
                    <Button variant="outline" size="sm" className="w-[48%]" asChild>
                      <a href={property.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visa original
                      </a>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                    onClick={() => handleDelete(property.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog för att visa alla egenskaper */}
        <Dialog open={!!selectedFeatures} onOpenChange={() => setSelectedFeatures(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Egenskaper för {dialogTitle}</DialogTitle>
              <DialogDescription>Alla egenskaper för denna fastighet</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedFeatures?.map((feature, index) => (
                <Badge key={index} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
