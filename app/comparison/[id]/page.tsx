"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  ArrowLeft,
  Brain,
  Home,
  MapPin,
  Star,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Trophy,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PropertyWithAnalysis {
  id: string
  title: string
  location: string
  price: string
  size: string
  rooms: string
  description: string
  features: string[]
  images: string[]
  url: string
  year_built?: string
  monthly_fee?: string
  is_analyzed: boolean
  analysis?: any
}

interface ComparisonData {
  id: string
  title: string
  description: string
  created_at: string
  updated_at: string
  property_ids: string[]
  ai_analysis: any
  properties: PropertyWithAnalysis[]
}

export default function ComparisonPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadComparison() {
      if (!user) return

      try {
        // Hämta jämförelsen
        const { data: comparisonData, error: comparisonError } = await supabase
          .from("property_comparisons")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single()

        if (comparisonError) {
          throw comparisonError
        }

        if (!comparisonData) {
          throw new Error("Jämförelsen hittades inte")
        }

        // Hämta fastigheterna som ingår i jämförelsen
        const { data: properties, error: propertiesError } = await supabase
          .from("saved_properties")
          .select("*")
          .in("id", comparisonData.property_ids)
          .eq("user_id", user.id)

        if (propertiesError) {
          throw propertiesError
        }

        // Hämta analysdata för fastigheter som har analyserats
        const propertiesWithAnalysis = await Promise.all(
          properties.map(async (property) => {
            if (property.is_analyzed) {
              const { data: analysis, error: analysisError } = await supabase
                .from("property_analyses")
                .select("*")
                .eq("property_id", property.id)
                .single()

              if (analysisError) {
                console.error("Fel vid hämtning av analys för fastighet:", property.id, analysisError)
                return property
              }

              return { ...property, analysis }
            }
            return property
          }),
        )

        // Sortera fastigheterna i samma ordning som property_ids
        const sortedProperties = comparisonData.property_ids
          .map((id) => propertiesWithAnalysis.find((property) => property.id === id))
          .filter(Boolean) as PropertyWithAnalysis[]

        setComparison({
          ...comparisonData,
          properties: sortedProperties,
        })
      } catch (error: any) {
        console.error("Fel vid laddning av jämförelse:", error)
        setError(error.message || "Kunde inte ladda jämförelsen")
      } finally {
        setIsLoading(false)
      }
    }

    loadComparison()
  }, [user, params.id])

  const handleAnalyze = async () => {
    if (!comparison || !user) return

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch("/api/analyze-comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comparisonId: comparison.id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kunde inte analysera jämförelsen")
      }

      const data = await response.json()

      // Uppdatera comparison-objektet med analysresultaten
      setComparison({
        ...comparison,
        ai_analysis: data.analysis,
      })
    } catch (error) {
      console.error("Fel vid analys av jämförelse:", error)
      setAnalysisError(error instanceof Error ? error.message : "Kunde inte analysera jämförelsen")
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

  // Funktion för att formatera datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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

  if (error || !comparison) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-10 px-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-md mb-4">{error || "Jämförelsen hittades inte"}</div>
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

  const isAnalyzed = !!comparison.ai_analysis
  const recommendedProperty =
    isAnalyzed && comparison.ai_analysis.recommendation?.bestChoice !== null
      ? comparison.properties[comparison.ai_analysis.recommendation.bestChoice]
      : null

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{comparison.title}</h1>
            <p className="text-gray-500">
              Skapad {formatDate(comparison.created_at)}
              {comparison.created_at !== comparison.updated_at && ` • Uppdaterad ${formatDate(comparison.updated_at)}`}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/saved?tab=comparisons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
          </div>
        </div>

        {comparison.description && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <p className="text-gray-700">{comparison.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Analysknapp */}
        {!isAnalyzed && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">AI-analys av jämförelsen</h3>
                  <p className="text-gray-600">
                    Låt AI analysera och jämföra dessa fastigheter för att få en detaljerad jämförelse och
                    rekommendation.
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

        {/* AI-analys resultat */}
        {isAnalyzed && (
          <div className="space-y-6 mb-8">
            {/* Sammanfattning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Jämförelseanalys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-md mb-6">
                  <p className="text-gray-700">{comparison.ai_analysis.summary}</p>
                </div>

                {recommendedProperty && (
                  <div className="bg-green-50 p-4 rounded-md flex items-start gap-3">
                    <Trophy className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-green-800 mb-1">Rekommendation: {recommendedProperty.title}</h3>
                      <p className="text-gray-700">{comparison.ai_analysis.recommendation.reasoning}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jämförelsetabell */}
            <Card>
              <CardHeader>
                <CardTitle>Jämförelsetabell</CardTitle>
                <CardDescription>Poäng för varje fastighet inom olika kategorier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Kategori</TableHead>
                        {comparison.properties.map((property, index) => (
                          <TableHead key={index}>{property.title}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.ai_analysis.comparisonTable.map((category: any, categoryIndex: number) => (
                        <TableRow key={categoryIndex}>
                          <TableCell className="font-medium">
                            {category.category}
                            <div className="text-xs text-gray-500">{category.description}</div>
                          </TableCell>
                          {comparison.properties.map((_, propertyIndex) => {
                            const scoreData = category.scores.find((s: any) => s.propertyIndex === propertyIndex)
                            return (
                              <TableCell key={propertyIndex}>
                                {scoreData ? (
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-bold ${getScoreColor(scoreData.score)}`}>
                                        {scoreData.score}
                                      </span>
                                      <Progress value={scoreData.score * 10} className="h-1.5 w-16" />
                                    </div>
                                    <div className="text-xs text-gray-600">{scoreData.comment}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Viktiga överväganden */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Viktiga överväganden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {comparison.ai_analysis.keyConsiderations.map((consideration: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                      <span>{consideration}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fastighetsdetaljer */}
        <h2 className="text-xl font-bold mb-4">Jämförda fastigheter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comparison.properties.map((property, index) => (
            <Card key={property.id} className="overflow-hidden flex flex-col h-full">
              {/* Bild */}
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

                {/* Visa rekommendationsikon om detta är den rekommenderade fastigheten */}
                {recommendedProperty && recommendedProperty.id === property.id && (
                  <div className="absolute top-2 left-2 bg-green-100 text-green-800 rounded-full p-1 px-2 text-sm font-bold flex items-center">
                    <Trophy className="h-3.5 w-3.5 mr-1 text-green-600" />
                    Rekommenderad
                  </div>
                )}

                {/* Visa fastighetsnummer */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>

              {/* Rubrik och plats */}
              <CardHeader className="pb-2">
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

                {/* För- och nackdelar från jämförelseanalysen */}
                {isAnalyzed && comparison.ai_analysis.propertyComparisons && (
                  <div className="space-y-3">
                    {comparison.ai_analysis.propertyComparisons[index] && (
                      <>
                        {/* Styrkor */}
                        {comparison.ai_analysis.propertyComparisons[index].strengths.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-green-700 flex items-center mb-1">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Styrkor
                            </h4>
                            <ul className="text-xs space-y-1">
                              {comparison.ai_analysis.propertyComparisons[index].strengths
                                .slice(0, 3)
                                .map((strength: string, i: number) => (
                                  <li key={i} className="flex items-start">
                                    <span className="text-green-500 mr-1">✓</span>
                                    <span className="text-gray-700">{strength}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {/* Svagheter */}
                        {comparison.ai_analysis.propertyComparisons[index].weaknesses.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-red-700 flex items-center mb-1">
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Svagheter
                            </h4>
                            <ul className="text-xs space-y-1">
                              {comparison.ai_analysis.propertyComparisons[index].weaknesses
                                .slice(0, 3)
                                .map((weakness: string, i: number) => (
                                  <li key={i} className="flex items-start">
                                    <span className="text-red-500 mr-1">✗</span>
                                    <span className="text-gray-700">{weakness}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Egenskaper/badges */}
                {property.features && property.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {property.features.slice(0, 3).map((feature, featureIndex) => (
                      <Badge key={featureIndex} variant="secondary" className="text-xs">
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

              {/* Knappar */}
              <CardFooter className="pt-4 border-t">
                <Button className="w-full" variant="outline" onClick={() => router.push(`/property/${property.id}`)}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Visa detaljer
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  )
}
