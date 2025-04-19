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
  Search,
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DebugPanel } from "@/components/debug-panel"
import { ComparisonButton } from "@/components/comparison-button"
import { PropertyAssistant } from "@/components/property-assistant"
import { BrokerInfoCard } from "@/components/broker-info-card"
import { searchBrokerInfo } from "@/lib/tavily-search"
import { DebugBrokerSearch } from "@/components/debug-broker-search"

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
  broker_info?: {
    results: any[]
    searchQuery: string
    isFallback?: boolean
  }
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
  const [isSaving, setIsSaving] = useState(false)
  const [brokerInfo, setBrokerInfo] = useState<any>(null)
  const [isBrokerInfoLoading, setIsBrokerInfoLoading] = useState(false)

  // Fetch property data
  useEffect(() => {
    async function loadProperty() {
      if (!user) return

      try {
        console.log("Loading property with ID:", params.id)

        // First try to get from sessionStorage (if user came from saved properties)
        const sessionProperty = sessionStorage.getItem("viewProperty")
        if (sessionProperty) {
          const parsedProperty = JSON.parse(sessionProperty)
          if (parsedProperty.id === params.id) {
            console.log("Found property in session storage:", parsedProperty.id)
            setProperty(parsedProperty)
            setIsLoading(false)

            // If property is analyzed, fetch the analysis
            if (parsedProperty.is_analyzed) {
              loadAnalysis(parsedProperty.id)
            } else {
              setIsAnalysisLoading(false)
            }
            return
          }
        }

        // Otherwise fetch from database
        console.log("Fetching property from database:", params.id)
        const { data, error } = await supabase
          .from("saved_properties")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single()

        if (error) {
          console.error("Supabase error:", error)
          throw error
        }

        if (!data) {
          throw new Error("Fastigheten hittades inte")
        }

        console.log("Property loaded from database:", data.id)
        setProperty(data)

        // If property is analyzed, fetch the analysis
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

  // Fetch analysis data
  const loadAnalysis = async (propertyId: string) => {
    try {
      setIsAnalysisLoading(true)
      console.log("Loading analysis for property:", propertyId)

      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("property_id", propertyId)
        .single()

      if (error) {
        console.error("Fel vid hämtning av analys:", error)
        setAnalysisError("Kunde inte hämta analysen")
      } else if (data) {
        console.log("Analysis loaded:", data.id)
        setAnalysis(data)

        // Check if broker_info exists in the analysis
        if (data.broker_info && data.broker_info.results && data.broker_info.results.length > 0) {
          console.log(`✅ Found broker info in analysis with ${data.broker_info.results.length} results`)
          setBrokerInfo(data.broker_info)
        } else {
          console.log("❌ No broker info found in analysis")
        }
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

  const handleSave = async () => {
    if (!property || !user) return

    setIsSaving(true)
    try {
      if (property.user_id !== user.id) {
        // This is not the user's property, so create a copy
        const propertyData = {
          user_id: user.id,
          title: property.title,
          price: property.price,
          size: property.size,
          rooms: property.rooms,
          location: property.location,
          description: property.description,
          features: property.features,
          images: property.images,
          url: property.url,
          agent: property.agent,
          year_built: property.year_built,
          monthly_fee: property.monthly_fee,
          energy_rating: property.energy_rating,
          is_analyzed: false, // Reset analysis status for the copy
        }

        const { error } = await supabase.from("saved_properties").insert([propertyData])

        if (error) {
          throw error
        }

        alert("En kopia av fastigheten har sparats till din lista")
      } else {
        alert("Denna fastighet finns redan i din lista")
      }
    } catch (error: any) {
      console.error("Fel vid sparande av fastighet:", error)
      alert("Kunde inte spara fastigheten: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSearchBroker = async () => {
    if (!property || !property.agent) return

    setIsBrokerInfoLoading(true)
    try {
      console.log(`🔍 Manually searching for broker: "${property.agent}" in location: "${property.location}"`)

      // Use the API endpoint for better error handling
      const response = await fetch("/api/broker-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brokerName: property.agent,
          location: property.location,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.results && data.results.results && data.results.results.length > 0) {
        console.log(`✅ Found ${data.results.results.length} results for broker`)
        setBrokerInfo(data.results)

        // If we have an analysis, update it with the broker info
        if (analysis) {
          const { error } = await supabase
            .from("property_analyses")
            .update({ broker_info: data.results })
            .eq("id", analysis.id)

          if (error) {
            console.error("Error updating analysis with broker info:", error)
          }
        }
      } else {
        console.log("❌ No results found for broker")
        alert("Kunde inte hitta information om mäklaren. Försök igen senare.")
      }
    } catch (error) {
      console.error("Error searching for broker:", error)
      alert("Ett fel uppstod vid sökning efter mäklarinformation.")
    } finally {
      setIsBrokerInfoLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!property || !user) return

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      // First, search for broker information if a broker name exists
      let brokerSearchResults = null
      if (property.agent) {
        setIsBrokerInfoLoading(true)
        console.log(`🔍 Starting broker search for: "${property.agent}" in location: "${property.location}"`)
        brokerSearchResults = await searchBrokerInfo(property.agent, property.location)
        setIsBrokerInfoLoading(false)

        if (brokerSearchResults && brokerSearchResults.results && brokerSearchResults.results.length > 0) {
          console.log(`✅ Broker search completed with ${brokerSearchResults.results.length} results`)
          setBrokerInfo(brokerSearchResults)
        } else {
          console.log(`❌ No broker information found for: ${property.agent}`)
        }
      }

      // Call the API route with the complete property data in the payload
      const response = await fetch("/api/property/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: property.id,
          userId: user.id,
          propertyData: property,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kunde inte analysera fastigheten")
      }

      const data = await response.json()

      // Save the analysis to the database on the client side
      try {
        // First check if an analysis already exists
        const { data: existingAnalysis, error: checkError } = await supabase
          .from("property_analyses")
          .select("id")
          .eq("property_id", property.id)
          .maybeSingle()

        // Include broker info in the analysis data
        const analysisData = {
          analysis_summary: data.analysis.analysis_summary,
          total_score: data.analysis.total_score,
          attribute_scores: data.analysis.attribute_scores,
          pros: data.analysis.pros,
          cons: data.analysis.cons,
          investment_rating: data.analysis.investment_rating,
          value_for_money: data.analysis.value_for_money,
          updated_at: new Date().toISOString(),
          broker_info: brokerSearchResults,
        }

        if (existingAnalysis) {
          // Update existing analysis
          await supabase.from("property_analyses").update(analysisData).eq("id", existingAnalysis.id)
        } else {
          // Create new analysis
          await supabase.from("property_analyses").insert({
            property_id: property.id,
            ...analysisData,
          })
        }

        // Update the property's is_analyzed flag
        await supabase
          .from("saved_properties")
          .update({ is_analyzed: true })
          .eq("id", property.id)
          .eq("user_id", user.id)

        // Update the UI with the new analysis
        setProperty({
          ...property,
          is_analyzed: true,
        })

        // Include broker info in the analysis state
        setAnalysis({
          ...data.analysis,
          broker_info: brokerSearchResults,
        })
      } catch (dbError) {
        console.error("Fel vid sparande av analys i databasen:", dbError)
        // Still show the analysis even if saving to DB failed
        setProperty({
          ...property,
          is_analyzed: true,
        })
        setAnalysis({
          ...data.analysis,
          broker_info: brokerSearchResults,
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

  // Function to get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600"
    if (score >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  // Function to get score background color based on value
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
        <div className="flex flex-col mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{property.title}</h1>
            <div className="flex items-center text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{property.location}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link href="/saved" className="col-span-1">
              <Button variant="outline" className="w-full" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <div className="col-span-1">
              <ComparisonButton property={property} size="sm" className="w-full" />
            </div>
            <Button variant="outline" asChild className="col-span-1" size="sm">
              <a href={property.url} target="_blank" rel="noopener noreferrer" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visa original
              </a>
            </Button>
            <Button
              variant="outline"
              className="col-span-1 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Ta bort
            </Button>
          </div>
        </div>

        {/* Analyze button */}
        {!isAnalyzed && !isAnalysisLoading && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">AI-analys av fastigheten</h3>
                  <p className="text-gray-600">
                    Låt AI analysera denna fastighet för att få poäng, för- och nackdelar, och investeringsvärdering.
                    {property.agent && " Information om mäklaren kommer också att hämtas."}
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
          {/* Left column - Images and description */}
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

                {/* Show total score if available */}
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
                {/* AI analysis and summary */}
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

            {/* Pros and cons */}
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

          {/* Right column - Details and scores */}
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
                  <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">Mäklare</div>
                        <div className="font-medium">{property.agent}</div>
                      </div>

                      {/* Manual search button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSearchBroker}
                        disabled={isBrokerInfoLoading}
                        className="h-8 px-2"
                      >
                        {isBrokerInfoLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Broker info loading indicator */}
                    {isBrokerInfoLoading && (
                      <div className="flex items-center justify-center mt-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">Hämtar information om mäklaren...</span>
                      </div>
                    )}

                    {/* Display broker info if available */}
                    {brokerInfo && brokerInfo.results && brokerInfo.results.length > 0 ? (
                      <BrokerInfoCard
                        brokerName={property.agent}
                        searchResults={brokerInfo.results}
                        isFallback={brokerInfo.isFallback}
                      />
                    ) : (
                      !isBrokerInfoLoading && (
                        <div className="mt-2 text-sm text-gray-500">
                          Ingen ytterligare information hittad om denna mäklare.
                        </div>
                      )
                    )}
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

            {/* Attribute scores */}
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

            {/* Investment value */}
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

        {/* Image gallery */}
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
        <DebugPanel propertyId={property?.id} />
        {/* Property Assistant */}
        <PropertyAssistant property={property} />

        {/* Debug Broker Search */}
        {process.env.NODE_ENV !== "production" && property.agent && (
          <DebugBrokerSearch brokerName={property.agent} location={property.location} />
        )}
      </div>
    </ProtectedRoute>
  )
}
