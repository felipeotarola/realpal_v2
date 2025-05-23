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
import { BrokerInfoCard } from "@/components/broker-info-card"
import { searchBrokerInfo } from "@/lib/tavily-search"
import { DebugBrokerSearch } from "@/components/debug-broker-search"
import { PreferenceMatchCard } from "@/components/preference-match-card"
import { DebugPreferenceMatch } from "@/components/debug-preference-match"
import { ChatDrawer } from "@/components/chat-drawer"
import { getPropertyContext } from "@/lib/property-context-provider"
// Add the import for PropertyLocationMap
import { PropertyLocationMap } from "@/components/property-location-map"

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
  preference_match?: {
    score: number
    percentage: number
    matches: any // This can be different formats
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
  const [isSaving, setIsSaving] = useState(false)
  const [brokerInfo, setBrokerInfo] = useState<any>(null)
  const [isBrokerInfoLoading, setIsBrokerInfoLoading] = useState(false)
  const [preferenceMatch, setPreferenceMatch] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isCalculatingMatch, setIsCalculatingMatch] = useState(false)
  const [propertyContextString, setPropertyContextString] = useState<string | null>(null)
  const router = useRouter()

  // Helper function to add debug info
  const addDebugInfo = (message: string) => {
    console.log(message)
    setDebugInfo((prev) => [...prev, message])
  }

  // Fetch property context
  useEffect(() => {
    async function loadPropertyContext() {
      if (!params.id) return

      try {
        const contextString = await getPropertyContext(params.id)
        setPropertyContextString(contextString)
        addDebugInfo("Property context loaded successfully")
      } catch (error) {
        console.error("Error loading property context:", error)
        addDebugInfo("Error loading property context")
      }
    }

    loadPropertyContext()
  }, [params.id])

  // Fetch property data
  useEffect(() => {
    async function loadProperty() {
      if (!user) return

      try {
        addDebugInfo("Loading property with ID: " + params.id)

        // First try to get from sessionStorage (if user came from saved properties)
        const sessionProperty = sessionStorage.getItem("viewProperty")
        if (sessionProperty) {
          const parsedProperty = JSON.parse(sessionProperty)
          if (parsedProperty.id === params.id) {
            addDebugInfo("Found property in session storage: " + parsedProperty.id)
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
        addDebugInfo("Fetching property from database: " + params.id)
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

        addDebugInfo("Property loaded from database: " + data.id)
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
      addDebugInfo("Loading analysis for property: " + propertyId)

      // Fetch the analysis data with explicit selection of preference_match
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*, preference_match")
        .eq("property_id", propertyId)
        .single()

      if (error) {
        console.error("Error fetching analysis:", error)
        setAnalysisError("Kunde inte hämta analysen")
        addDebugInfo("Error fetching analysis: " + error.message)
      } else if (data) {
        addDebugInfo("Analysis loaded: " + data.id)

        // Check if preference_match exists and log its structure
        if (data.preference_match) {
          addDebugInfo(`✅ Found preference match with score: ${data.preference_match.percentage || 0}%`)
          addDebugInfo(`Preference match data structure: ${JSON.stringify(data.preference_match).substring(0, 200)}...`)
          setPreferenceMatch(data.preference_match)
        } else {
          addDebugInfo("❌ No preference match found in analysis")

          // If user is logged in, try to calculate preference match on the fly
          if (user && property) {
            addDebugInfo("Attempting to calculate preference match on the fly...")
            fetchPreferenceMatch(propertyId, user.id)
          }
        }

        // Check if broker_info exists in the analysis
        if (data.broker_info && data.broker_info.results && data.broker_info.results.length > 0) {
          addDebugInfo(`✅ Found broker info in analysis with ${data.broker_info.results.length} results`)
          setBrokerInfo(data.broker_info)
        } else {
          addDebugInfo("❌ No broker info found in analysis")
        }

        setAnalysis(data)
      }
    } catch (error) {
      console.error("Error fetching analysis:", error)
      setAnalysisError("Kunde inte hämta analysen")
      addDebugInfo("Error in loadAnalysis: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  // Replace the fetchPreferenceMatch function with this new implementation
  const fetchPreferenceMatch = async (propertyId: string, userId: string) => {
    try {
      setIsCalculatingMatch(true)
      addDebugInfo("Calculating preference match directly on client side...")

      // 1. Fetch property data
      const { data: property, error: propertyError } = await supabase
        .from("saved_properties")
        .select("*")
        .eq("id", propertyId)
        .single()

      if (propertyError || !property) {
        addDebugInfo(`❌ Error fetching property: ${propertyError?.message || "Property not found"}`)
        return
      }

      // 2. Fetch user preferences
      const { data: preferences, error: prefError } = await supabase
        .from("user_property_requirements")
        .select("feature_id, value, importance")
        .eq("user_id", userId)

      if (prefError) {
        addDebugInfo(`❌ Error fetching preferences: ${prefError.message}`)
        return
      }

      if (!preferences || preferences.length === 0) {
        addDebugInfo("❌ No preferences found for user")
        return
      }

      addDebugInfo(`✅ Found ${preferences.length} preferences for user`)

      // 3. Fetch feature definitions
      const { data: features, error: featError } = await supabase.from("property_features").select("*")

      if (featError) {
        addDebugInfo(`❌ Error fetching features: ${featError.message}`)
        return
      }

      // 4. Format preferences for match calculation
      const userPreferences = preferences.reduce((acc, pref) => {
        const value =
          pref.value && typeof pref.value === "object" && "value" in pref.value ? pref.value.value : pref.value

        acc[pref.feature_id] = {
          value,
          importance: pref.importance,
        }
        return acc
      }, {})

      addDebugInfo("Formatted user preferences: " + JSON.stringify(userPreferences).substring(0, 100) + "...")

      // 5. Create property features object
      const propertyFeatures: Record<string, any> = {
        rooms: Number.parseInt(property.rooms) || 0,
        size: Number.parseInt(property.size) || 0,
      }

      // Add boolean features based on features array
      const featureKeywords = {
        balkong: "balcony",
        hiss: "elevator",
        parkering: "parking",
        garage: "garage",
        trädgård: "garden",
        renoverad: "renovated",
        "öppen spis": "fireplace",
        badkar: "bathtub",
        diskmaskin: "dishwasher",
        tvättmaskin: "laundry",
      }

      // Check if features exist in the features array
      Object.entries(featureKeywords).forEach(([swedish, english]) => {
        const hasFeature = property.features.some(
          (feature) => feature.toLowerCase().includes(swedish) || feature.toLowerCase().includes(english),
        )
        propertyFeatures[english] = hasFeature
        addDebugInfo(`Feature ${english}: ${hasFeature ? "Yes" : "No"}`)
      })

      // 6. Calculate match score
      // Import the calculation function directly
      const { calculatePropertyMatchScore } = await import("@/lib/property-scoring")
      const matchResult = calculatePropertyMatchScore(propertyFeatures, userPreferences, features)

      addDebugInfo(`✅ Preference match calculation complete: ${matchResult.percentage}%`)
      addDebugInfo(`Match result: ${JSON.stringify(matchResult).substring(0, 200)}...`)

      // 7. Update the UI with the match result
      setPreferenceMatch(matchResult)

      // 8. Update the analysis state if it exists
      if (analysis) {
        setAnalysis({
          ...analysis,
          preference_match: matchResult,
        })

        // 9. Also update the database
        const { data: analysisRecord } = await supabase
          .from("property_analyses")
          .select("id")
          .eq("property_id", propertyId)
          .single()

        if (analysisRecord) {
          const { error } = await supabase
            .from("property_analyses")
            .update({
              preference_match: matchResult,
              updated_at: new Date().toISOString(),
            })
            .eq("id", analysisRecord.id)

          if (error) {
            addDebugInfo(`❌ Error updating analysis with preference match: ${error.message}`)
          } else {
            addDebugInfo("✅ Updated analysis in database with preference match data")
          }
        }
      }

      return matchResult
    } catch (error) {
      console.error("Error calculating preference match:", error)
      addDebugInfo(`❌ Error in fetchPreferenceMatch: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsCalculatingMatch(false)
    }
  }

  // Update the preparePreferenceMatchData function to better handle different data formats
  // Replace the existing preparePreferenceMatchData function with this version:

  const preparePreferenceMatchData = () => {
    // First try to use the preferenceMatch state (which might be more up-to-date)
    const matchData = preferenceMatch || analysis?.preference_match || null

    if (!matchData) {
      // Don't call addDebugInfo here to avoid state updates during render
      console.log("No preference match data available")
      return null
    }

    console.log(`Preparing preference match data: ${JSON.stringify(matchData).substring(0, 100)}...`)

    // Ensure we have the basic required properties
    const result = {
      score: matchData.score || 0,
      percentage: matchData.percentage || 0,
      matches: {},
    }

    // Handle different formats of the matches property
    if (matchData.matches) {
      // If matches is already in the correct format (object with feature entries)
      if (
        typeof matchData.matches === "object" &&
        !Array.isArray(matchData.matches) &&
        !("matched" in matchData.matches)
      ) {
        result.matches = matchData.matches
      }
      // If matches has the old format with matched/unmatched arrays
      else if (
        typeof matchData.matches === "object" &&
        (Array.isArray(matchData.matches.matched) || Array.isArray(matchData.matches.unmatched))
      ) {
        // Create a simplified version of the matches object
        const formattedMatches = {}

        // Add matched items
        if (Array.isArray(matchData.matches.matched)) {
          matchData.matches.matched.forEach((label, i) => {
            formattedMatches[`matched-${i}`] = {
              matched: true,
              importance: 3, // Default importance
              featureLabel: label,
            }
          })
        }

        // Add unmatched items
        if (Array.isArray(matchData.matches.unmatched)) {
          matchData.matches.unmatched.forEach((label, i) => {
            formattedMatches[`unmatched-${i}`] = {
              matched: false,
              importance: 3, // Default importance
              featureLabel: label,
            }
          })
        }

        result.matches = formattedMatches
      }
    }

    console.log(`Prepared match data with ${Object.keys(result.matches).length} feature matches`)
    return result
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
      addDebugInfo(`🔍 Manually searching for broker: "${property.agent}" in location: "${property.location}"`)

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
        addDebugInfo(`✅ Found ${data.results.results.length} results for broker`)
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
        addDebugInfo("❌ No results found for broker")
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
        addDebugInfo(`🔍 Starting broker search for: "${property.agent}" in location: "${property.location}"`)
        brokerSearchResults = await searchBrokerInfo(property.agent, property.location)
        setIsBrokerInfoLoading(false)

        if (brokerSearchResults && brokerSearchResults.results && brokerSearchResults.results.length > 0) {
          addDebugInfo(`✅ Broker search completed with ${brokerSearchResults.results.length} results`)
          setBrokerInfo(brokerSearchResults)
        } else {
          addDebugInfo(`❌ No broker information found for: ${property.agent}`)
        }
      }

      // Call the API route with the complete property data in the payload
      addDebugInfo("Calling property analysis API...")
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
      addDebugInfo("Analysis API call successful")

      // Check if preference match was calculated
      if (data.analysis.preference_match) {
        addDebugInfo(`✅ Preference match calculated: ${data.analysis.preference_match.percentage}%`)
        setPreferenceMatch(data.analysis.preference_match)
      } else {
        addDebugInfo("❌ No preference match in analysis response")
      }

      // Save the analysis to the database on the client side
      try {
        // First check if an analysis already exists
        const { data: existingAnalysis, error: checkError } = await supabase
          .from("property_analyses")
          .select("id")
          .eq("property_id", property.id)
          .maybeSingle()

        // Include broker info and preference match in the analysis data
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
          preference_match: data.analysis.preference_match,
        }

        if (existingAnalysis) {
          // Update existing analysis
          addDebugInfo(`Updating existing analysis: ${existingAnalysis.id}`)
          const { error } = await supabase.from("property_analyses").update(analysisData).eq("id", existingAnalysis.id)

          if (error) {
            addDebugInfo(`❌ Error updating analysis: ${error.message}`)
          } else {
            addDebugInfo("✅ Analysis updated successfully")
          }
        } else {
          // Create new analysis
          addDebugInfo("Creating new analysis record")
          const { error } = await supabase.from("property_analyses").insert({
            property_id: property.id,
            ...analysisData,
          })

          if (error) {
            addDebugInfo(`❌ Error creating analysis: ${error.message}`)
          } else {
            addDebugInfo("✅ Analysis created successfully")
          }
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

        // Include broker info and preference match in the analysis state
        setAnalysis({
          ...data.analysis,
          broker_info: brokerSearchResults,
          preference_match: data.analysis.preference_match,
        })
      } catch (dbError) {
        console.error("Fel vid sparande av analys i databasen:", dbError)
        addDebugInfo(
          `❌ Error saving analysis to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        )

        // Still show the analysis even if saving to DB failed
        setProperty({
          ...property,
          is_analyzed: true,
        })
        setAnalysis({
          ...data.analysis,
          broker_info: brokerSearchResults,
          preference_match: data.analysis.preference_match,
        })
      }
    } catch (error) {
      console.error("Fel vid analys av fastighet:", error)
      setAnalysisError(error instanceof Error ? error.message : "Kunde inte analysera fastigheten")
      addDebugInfo(`❌ Error in handleAnalyze: ${error instanceof Error ? error.message : String(error)}`)
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
  const preferenceMatchData = preparePreferenceMatchData()

  // Prepare property context for the AI assistant
  const getPropertyContextString = async () => {
    return await getPropertyContext(params.id)
  }

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

            {/* Preference Match */}
            {isAnalyzed && (
              <Card>
                <CardHeader>
                  <CardTitle>Matchning med dina preferenser</CardTitle>
                  <CardDescription>Hur väl denna fastighet matchar dina inställda preferenser</CardDescription>
                </CardHeader>
                <CardContent>
                  {preferenceMatchData ? (
                    <PreferenceMatchCard
                      score={preferenceMatchData.score}
                      percentage={preferenceMatchData.percentage}
                      matches={preferenceMatchData.matches}
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-md text-center">
                      <p className="text-gray-500">Ingen preferensmatchning tillgänglig.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Ställ in dina preferenser under Preferenser-menyn och analysera fastigheten igen för att se
                        matchning.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => user && property && fetchPreferenceMatch(property.id, user.id)}
                        disabled={isCalculatingMatch}
                      >
                        {isCalculatingMatch ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Beräknar...
                          </>
                        ) : (
                          "Beräkna matchning"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Location Map */}
            <Card>
              <PropertyLocationMap propertyId={property.id} propertyLocation={property.location} userId={user.id} />
            </Card>
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

        {/* Debug info */}
        {process.env.NODE_ENV !== "production" && debugInfo.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-200 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
                {debugInfo.map((msg, i) => (
                  <div key={i} className="mb-1">
                    {msg}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug components */}
        {process.env.NODE_ENV !== "production" && (
          <>
            <DebugPanel propertyId={property?.id} />
            <DebugPreferenceMatch propertyId={property?.id} />
            {property.agent && <DebugBrokerSearch brokerName={property.agent} location={property.location} />}
          </>
        )}

        {/* Property Assistant */}
        <ChatDrawer propertyContext={propertyContextString || undefined} />
      </div>
    </ProtectedRoute>
  )
}
