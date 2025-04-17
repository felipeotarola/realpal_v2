"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageGallery } from "@/components/image-gallery"
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Home,
  MapPin,
  Calendar,
  Info,
  Star,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Brain,
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  is_analyzed: boolean
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const router = useRouter()

  // Hämta fastighetsdata
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

            // Om fastigheten är analyserad, hämta analysen
            if (parsedProperty.is_analyzed) {
              loadAnalysis(parsedProperty.id)
            } else {
              setIsAnalysisLoading(false)
            }
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

        // Om fastigheten är analyserad, hämta analysen
        if (data.is_analyzed) {
          loadAnalysis(data.id)
        } else {
          setIsAnalysisLoading(false)
        }
      } catch (error: any) {
        console.error("Fel vid laddning av fastighet:", error)
        setError(error.message || "Kunde inte ladda fastighetsdetaljer")
        setIsAnalysisLoading(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadProperty()
  }, [user, params.id])

  // Hämta analysdata
  const loadAnalysis = async (propertyId: string) => {
    try {
      setIsAnalysisLoading(true)

      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("property_id", propertyId)
        .single()

      if (error) {
        console.error("Fel vid hämtning av analys:", error)
        setAnalysisError("Kunde inte hämta analysen")
      } else if (data) {
        setAnalysis(data)
      }
    } catch (error) {
      console.error("Fel vid hämtning av analys:", error)
      setAnalysisError("Kunde inte hämta analysen")
    } finally {
      setIsAnalysisLoading(false)
    }
  }

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

  const handleAnalyze = async () => {
    if (!property || !user) return

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch("/api/analyze-saved-property", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: property.id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kunde inte analysera fastigheten")
      }

      const data = await response.json()

      // Uppdatera property-objektet med is_analyzed = true
      setProperty({
        ...property,
        is_analyzed: true,
      })

      // Uppdatera analysis-objektet med analysresultaten
      if (data.alreadyAnalyzed) {
        // Om fastigheten redan var analyserad, använd befintlig analys
        setAnalysis({
          id: data.analysisId || "unknown",
          property_id: property.id,
          analysis_summary: data.analysis.summary,
          total_score: data.analysis.totalScore,
          attribute_scores: data.analysis.attributes,
          pros: data.analysis.pros,
          cons: data.analysis.cons,
          investment_rating: data.analysis.investmentRating,
          value_for_money: data.analysis.valueForMoney,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        // Om fastigheten just analyserades, använd ny analys
        setAnalysis({
          id: data.analysisId || "unknown",
          property_id: property.id,
          analysis_summary: data.analysis.summary,
          total_score: data.analysis.totalScore,
          attribute_scores: data.analysis.attributes,
          pros: data.analysis.pros,
          cons: data.analysis.cons,
          investment_rating: data.analysis.investmentRating,
          value_for_money: data.analysis.valueForMoney,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Fel vid analys av fastighet:", error)
      setAnalysisError(error instanceof Error ? error.message : "Kunde inte analysera fastigheten")
    } finally {
      setIsAnalyzing(false)
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

  const isAnalyzed = property.is_analyzed && analysis !== null

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

        {/* Analysknapp */}
        {!isAnalyzed && !isAnalysisLoading && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">AI-analys av fastigheten</h3>
                  <p className="text-gray-600">
                    Låt AI analysera denna fastighet för att få poäng, för- och nackdelar, och investeringsvärdering.
                  </p>
                </div>
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="min-w-[150px]">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyserar...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analysera
                    </>
                  )}
                </Button>
              </div>
              {analysisError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {isAnalysisLoading && property.is_analyzed && (
          <Card className="mb-6">
            <CardContent className="p-6 flex justify-center">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin text-gray-400" />
                <span>Hämtar analysdata...</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vänster kolumn - Bilder och beskrivning */}
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

                {/* Visa totalpoäng om tillgängligt */}
                {isAnalyzed && analysis.total_score && (
                  <div
                    className={`absolute top-4 right-4 ${getScoreBackgroundColor(analysis.total_score)} rounded-full p-2 px-3 font-bold text-lg flex items-center`}
                  >
                    <Star className="h-5 w-5 mr-1.5 text-yellow-500 fill-yellow-500" />
                    <span className={getScoreColor(analysis.total_score)}>{analysis.total_score.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                {/* AI-analys och sammanfattning */}
                {isAnalyzed && analysis.analysis_summary && (
                  <div className="bg-blue-50 p-4 rounded-md mb-6">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                      AI-analys
                    </h3>
                    <p className="text-gray-700">{analysis.analysis_summary}</p>
                  </div>
                )}

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

            {/* För- och nackdelar */}
            {isAnalyzed && (analysis.pros?.length || analysis.cons?.length) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>För- och nackdelar</CardTitle>
                  <CardDescription>AI-genererad analys av fastighetens styrkor och svagheter</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysis.pros && analysis.pros.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium mb-3 flex items-center text-green-700">
                          <ThumbsUp className="h-5 w-5 mr-2" />
                          Fördelar
                        </h3>
                        <ul className="space-y-2">
                          {analysis.pros.map((pro, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.cons && analysis.cons.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium mb-3 flex items-center text-red-700">
                          <ThumbsDown className="h-5 w-5 mr-2" />
                          Nackdelar
                        </h3>
                        <ul className="space-y-2">
                          {analysis.cons.map((con, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-500 mr-2">✗</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Höger kolumn - Detaljer och poäng */}
          <div className="space-y-6">
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
              </CardContent>
            </Card>

            {/* Attributpoäng */}
            {isAnalyzed && analysis.attribute_scores && analysis.attribute_scores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Attributpoäng</CardTitle>
                  <CardDescription>AI-genererade poäng för olika attribut</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.attribute_scores
                    .sort((a, b) => b.score - a.score)
                    .map((attr, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-medium">{attr.name}</span>
                          <span className={`font-bold ${getScoreColor(attr.score)}`}>{attr.score}</span>
                        </div>
                        <Progress value={attr.score * 10} className="h-2" />
                        <p className="text-sm text-gray-600">{attr.comment}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Investeringsvärde */}
            {isAnalyzed && (analysis.investment_rating || analysis.value_for_money) && (
              <Card>
                <CardHeader>
                  <CardTitle>Investeringsvärde</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.investment_rating && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Investeringsbetyg</span>
                        <span className={`font-bold ${getScoreColor(analysis.investment_rating)}`}>
                          {analysis.investment_rating}/10
                        </span>
                      </div>
                      <Progress value={analysis.investment_rating * 10} className="h-2" />
                    </div>
                  )}

                  {analysis.value_for_money && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Prisvärdhet</span>
                        <span className={`font-bold ${getScoreColor(analysis.value_for_money)}`}>
                          {analysis.value_for_money}/10
                        </span>
                      </div>
                      <Progress value={analysis.value_for_money * 10} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
