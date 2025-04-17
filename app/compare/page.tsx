"use client"

import { useState, useEffect } from "react"
import { useComparison } from "@/contexts/comparison-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  BarChart2,
  Brain,
  Check,
  ChevronRight,
  ExternalLink,
  Home,
  Loader2,
  MapPin,
  Save,
  Star,
  Trophy,
  X,
  History,
} from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

export default function ComparePage() {
  const {
    selectedProperties,
    removeProperty,
    clearComparison,
    aiComparison,
    loadingAiComparison,
    generateAiComparison,
    saveComparison,
    currentComparisonId,
    comparisonNotes,
    addComparisonNote,
  } = useComparison()
  const [activeTab, setActiveTab] = useState("overview")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)
  const [currentDescription, setCurrentDescription] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Effect to update title and description when a comparison is loaded
  useEffect(() => {
    if (currentComparisonId) {
      // Fetch the comparison details
      const fetchComparison = async () => {
        try {
          const response = await fetch(`/api/comparisons/${currentComparisonId}?userId=${user?.id}`)
          if (response.ok) {
            const data = await response.json()
            setCurrentTitle(data.comparison.title)
            setCurrentDescription(data.comparison.description || null)
          }
        } catch (error) {
          console.error("Error fetching comparison details:", error)
        }
      }

      fetchComparison()
    }
  }, [currentComparisonId, user])

  // Format currency
  const formatCurrency = (price: string) => {
    const numericValue = price.replace(/[^\d]/g, "")
    if (numericValue && !isNaN(Number(numericValue))) {
      return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(Number(numericValue))
    }
    return price
  }

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600"
    if (score >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  // Get background color based on value
  const getScoreBackgroundColor = (score: number) => {
    if (score >= 8) return "bg-green-100"
    if (score >= 6) return "bg-yellow-100"
    return "bg-red-100"
  }

  // Get winner background color
  const getWinnerBackground = (isWinner: boolean) => {
    return isWinner ? "bg-green-50 border-green-200" : ""
  }

  const handleSaveComparison = async () => {
    if (!title.trim()) {
      return
    }

    setIsSaving(true)
    try {
      const comparisonId = await saveComparison(title, description)
      if (comparisonId) {
        // Update the current title and description
        setCurrentTitle(title)
        setCurrentDescription(description)
        setSaveDialogOpen(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNote = async (propertyId?: string) => {
    if (!noteText.trim()) {
      return
    }

    setIsSaving(true)
    try {
      const success = await addComparisonNote(noteText, propertyId)
      if (success) {
        setNoteText("")
        setNoteDialogOpen(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedProperties.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-10 px-4">
          <div className="flex items-center mb-6">
            <Link href="/saved">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <h1 className="text-2xl font-bold ml-4">Jämför fastigheter</h1>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-medium mb-2">Inga fastigheter valda för jämförelse</h2>
                <p className="text-gray-500 mb-6">
                  Välj fastigheter att jämföra från din lista med sparade fastigheter
                </p>
                <Link href="/saved">
                  <Button>Gå till sparade fastigheter</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <Link href="/saved">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <h1 className="text-2xl font-bold ml-4">
              {currentComparisonId && currentTitle ? currentTitle : "Jämför fastigheter"}
            </h1>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={clearComparison}>
              <X className="h-4 w-4 mr-2" />
              Rensa jämförelse
            </Button>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Pre-fill with existing title and description if editing
                  if (currentComparisonId) {
                    setTitle(currentTitle || "Min fastighetsjämförelse")
                    setDescription(currentDescription || "")
                  } else {
                    setTitle("Min fastighetsjämförelse")
                    setDescription("")
                  }
                  setSaveDialogOpen(true)
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                {currentComparisonId ? "Uppdatera" : "Spara"} jämförelse
              </Button>
            )}

            {currentComparisonId && (
              <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Lägg till anteckning
              </Button>
            )}

            {!aiComparison && !loadingAiComparison && (
              <Button size="sm" onClick={generateAiComparison}>
                <Brain className="h-4 w-4 mr-2" />
                Generera AI-jämförelse
              </Button>
            )}
          </div>
        </div>

        {loadingAiComparison && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-3" />
                <p>Genererar AI-jämförelse...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {aiComparison && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-blue-600" />
                AI-jämförelseanalys
              </CardTitle>
              <CardDescription>Automatisk analys av fastigheterna</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <p className="text-gray-700">{aiComparison.summary}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Rekommendation</h3>
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    <span className="font-medium">
                      Bästa valet: {selectedProperties[aiComparison.recommendation.bestOverallValue].title}
                    </span>
                  </div>
                  <p className="text-gray-700">{aiComparison.recommendation.explanation}</p>

                  {aiComparison.recommendation.bestFor && aiComparison.recommendation.bestFor.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Bäst för specifika behov:</h4>
                      <ul className="space-y-2">
                        {aiComparison.recommendation.bestFor.map((item: any, index: number) => (
                          <li key={index} className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{item.scenario}:</span>{" "}
                              {selectedProperties[item.propertyIndex].title} - {item.explanation}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-medium mb-3">Kategorimarknader</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {aiComparison.categoryWinners.map((winner: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">{winner.category}</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Vinnare
                      </Badge>
                    </div>
                    <div className="font-medium">{selectedProperties[winner.winner].title}</div>
                    <p className="text-xs text-gray-600 mt-1">{winner.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {comparisonNotes && comparisonNotes.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Anteckningar</CardTitle>
                <CardDescription>Dina anteckningar om denna jämförelse</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Lägg till anteckning
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparisonNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-md ${note.property_id ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      {note.property_id ? (
                        <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                          <Home className="h-4 w-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-full p-2 flex-shrink-0">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-gray-700">{note.note_text}</p>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                          {note.property_id && (
                            <span className="text-xs font-medium text-blue-600">
                              {selectedProperties.find((p) => p.id === note.property_id)?.title || "Okänd fastighet"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="details">Detaljerad jämförelse</TabsTrigger>
            {aiComparison && <TabsTrigger value="analysis">AI-analys</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <div className="overflow-x-auto">
              <Table className="border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Egenskap</TableHead>
                    {selectedProperties.map((property, index) => (
                      <TableHead key={index} className="min-w-[250px]">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">{property.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeProperty(property.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="relative h-32 bg-gray-100 rounded-md overflow-hidden">
                            {property.images && property.images.length > 0 ? (
                              <img
                                src={property.images[0] || "/placeholder.svg"}
                                alt={property.title}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src =
                                    `/placeholder.svg?height=200&width=300&query=property`
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Home className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center mt-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1" />
                            <span className="text-xs text-gray-500 truncate">{property.location}</span>
                          </div>
                          <div className="flex justify-between mt-2">
                            <Link href={`/property/${property.id}`}>
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Detaljer
                              </Button>
                            </Link>
                            <a href={property.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Original
                              </Button>
                            </a>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Pris</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index} className="font-bold text-lg">
                        {formatCurrency(property.price)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Storlek</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index}>{property.size}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Rum</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index}>{property.rooms}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Månadsavgift</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index}>{property.monthly_fee || property.monthlyFee || "Ingen avgift"}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Byggår</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index}>{property.year_built || property.yearBuilt || "Okänt"}</TableCell>
                    ))}
                  </TableRow>
                  {selectedProperties.some((p) => p.analysis) && (
                    <TableRow>
                      <TableCell className="font-medium">Totalbetyg</TableCell>
                      {selectedProperties.map((property, index) => (
                        <TableCell key={index}>
                          {property.analysis ? (
                            <div className="flex items-center">
                              <div
                                className={`${getScoreBackgroundColor(property.analysis.total_score || property.analysis.totalScore)} rounded-full p-1 px-2 font-bold text-sm flex items-center mr-2`}
                              >
                                <Star className="h-3.5 w-3.5 mr-1 text-yellow-500 fill-yellow-500" />
                                <span
                                  className={getScoreColor(
                                    property.analysis.total_score || property.analysis.totalScore,
                                  )}
                                >
                                  {(property.analysis.total_score || property.analysis.totalScore).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            "Ingen analys"
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Egenskaper</TableCell>
                    {selectedProperties.map((property, index) => (
                      <TableCell key={index}>
                        <div className="flex flex-wrap gap-1">
                          {property.features.slice(0, 3).map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {property.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{property.features.length - 3} mer
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="details">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detaljerad jämförelse</CardTitle>
                  <CardDescription>Jämför alla egenskaper mellan fastigheterna</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="border">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Egenskap</TableHead>
                          {selectedProperties.map((property, index) => (
                            <TableHead key={index} className="min-w-[250px]">
                              <div className="font-bold">{property.title}</div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Beskrivning</TableCell>
                          {selectedProperties.map((property, index) => (
                            <TableCell key={index} className="max-w-xs">
                              <div className="line-clamp-4 text-sm">{property.description}</div>
                              <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                                Visa mer
                              </Button>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Alla egenskaper</TableCell>
                          {selectedProperties.map((property, index) => (
                            <TableCell key={index}>
                              <div className="flex flex-wrap gap-1">
                                {property.features.map((feature, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                        {selectedProperties.some((p) => p.analysis && p.analysis.pros) && (
                          <TableRow>
                            <TableCell className="font-medium">Fördelar</TableCell>
                            {selectedProperties.map((property, index) => (
                              <TableCell key={index}>
                                {property.analysis && property.analysis.pros ? (
                                  <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {(property.analysis.pros || []).map((pro: string, i: number) => (
                                      <li key={i}>{pro}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  "Ingen analys"
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )}
                        {selectedProperties.some((p) => p.analysis && p.analysis.cons) && (
                          <TableRow>
                            <TableCell className="font-medium">Nackdelar</TableCell>
                            {selectedProperties.map((property, index) => (
                              <TableCell key={index}>
                                {property.analysis && property.analysis.cons ? (
                                  <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {(property.analysis.cons || []).map((con: string, i: number) => (
                                      <li key={i}>{con}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  "Ingen analys"
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )}
                        {selectedProperties.some(
                          (p) => p.analysis && (p.analysis.investment_rating || p.analysis.investmentRating),
                        ) && (
                          <TableRow>
                            <TableCell className="font-medium">Investeringsbetyg</TableCell>
                            {selectedProperties.map((property, index) => (
                              <TableCell key={index}>
                                {property.analysis &&
                                (property.analysis.investment_rating || property.analysis.investmentRating) ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`font-bold ${getScoreColor(property.analysis.investment_rating || property.analysis.investmentRating)}`}
                                      >
                                        {property.analysis.investment_rating || property.analysis.investmentRating}/10
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        (property.analysis.investment_rating || property.analysis.investmentRating) * 10
                                      }
                                      className="h-2"
                                    />
                                  </div>
                                ) : (
                                  "Ingen analys"
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )}
                        {selectedProperties.some(
                          (p) => p.analysis && (p.analysis.value_for_money || p.analysis.valueForMoney),
                        ) && (
                          <TableRow>
                            <TableCell className="font-medium">Prisvärdhet</TableCell>
                            {selectedProperties.map((property, index) => (
                              <TableCell key={index}>
                                {property.analysis &&
                                (property.analysis.value_for_money || property.analysis.valueForMoney) ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`font-bold ${getScoreColor(property.analysis.value_for_money || property.analysis.valueForMoney)}`}
                                      >
                                        {property.analysis.value_for_money || property.analysis.valueForMoney}/10
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        (property.analysis.value_for_money || property.analysis.valueForMoney) * 10
                                      }
                                      className="h-2"
                                    />
                                  </div>
                                ) : (
                                  "Ingen analys"
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {aiComparison && (
            <TabsContent value="analysis">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Jämförelsetabell</CardTitle>
                    <CardDescription>AI-genererad jämförelse av nyckeltal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="border">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Kategori</TableHead>
                            {selectedProperties.map((property, index) => (
                              <TableHead key={index} className="min-w-[200px]">
                                <div className="font-bold">{property.title}</div>
                              </TableHead>
                            ))}
                            <TableHead className="w-[200px]">Noteringar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiComparison.comparisonTable.map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="font-medium">{row.category}</TableCell>
                              {row.values.map((cell: any, cellIndex: number) => (
                                <TableCell
                                  key={cellIndex}
                                  className={`${row.winner === cell.propertyIndex ? getWinnerBackground(true) : ""}`}
                                >
                                  <div className="flex items-center">
                                    {row.winner === cell.propertyIndex && (
                                      <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                                    )}
                                    <span>{cell.value}</span>
                                  </div>
                                  {cell.normalized && <Progress value={cell.normalized * 10} className="h-1.5 mt-1" />}
                                </TableCell>
                              ))}
                              <TableCell className="text-sm text-gray-600">{row.notes}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detaljerad analys</CardTitle>
                    <CardDescription>Styrkor och svagheter för varje fastighet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(aiComparison.detailedComparison).map(
                        ([key, value]: [string, any], index: number) => {
                          const propertyIndex = Number.parseInt(key.replace("property", ""))
                          const property = selectedProperties[propertyIndex]

                          return (
                            <Card key={index} className="border-2">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{property.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2 text-green-700">Styrkor:</h4>
                                  <ul className="space-y-1">
                                    {value.strengths.map((strength: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                        <span className="text-sm">{strength}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2 text-red-700">Svagheter:</h4>
                                  <ul className="space-y-1">
                                    {value.weaknesses.map((weakness: string, i: number) => (
                                      <li key={i} className="flex items-start">
                                        <X className="h-4 w-4 text-red-500 mr-2 mt-1 flex-shrink-0" />
                                        <span className="text-sm">{weakness}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {value.comparedTo && value.comparedTo.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Jämfört med andra fastigheter:</h4>
                                    {value.comparedTo.map((comparison: any, i: number) => {
                                      const comparedProperty = selectedProperties[comparison.propertyIndex]
                                      return (
                                        <div key={i} className="mb-3 bg-gray-50 p-3 rounded-md">
                                          <h5 className="text-sm font-medium mb-1">
                                            Jämfört med {comparedProperty.title}:
                                          </h5>

                                          {comparison.advantages && comparison.advantages.length > 0 && (
                                            <div className="mb-2">
                                              <h6 className="text-xs font-medium text-green-700 mb-1">Fördelar:</h6>
                                              <ul className="space-y-1">
                                                {comparison.advantages.map((adv: string, j: number) => (
                                                  <li key={j} className="flex items-start">
                                                    <Check className="h-3 w-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                                    <span className="text-xs">{adv}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}

                                          {comparison.disadvantages && comparison.disadvantages.length > 0 && (
                                            <div>
                                              <h6 className="text-xs font-medium text-red-700 mb-1">Nackdelar:</h6>
                                              <ul className="space-y-1">
                                                {comparison.disadvantages.map((disadv: string, j: number) => (
                                                  <li key={j} className="flex items-start">
                                                    <X className="h-3 w-3 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
                                                    <span className="text-xs">{disadv}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        },
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Save Comparison Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentComparisonId ? "Uppdatera" : "Spara"} jämförelse</DialogTitle>
              <DialogDescription>
                Spara denna jämförelse för att enkelt kunna komma tillbaka till den senare.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Titel
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Min fastighetsjämförelse"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Beskrivning (valfritt)
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lägg till en beskrivning av denna jämförelse..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSaveComparison} disabled={isSaving || !title.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {currentComparisonId ? "Uppdatera" : "Spara"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till anteckning</DialogTitle>
              <DialogDescription>
                Lägg till en anteckning om denna jämförelse eller om en specifik fastighet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="noteText" className="text-sm font-medium">
                  Anteckning
                </label>
                <Textarea
                  id="noteText"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Skriv din anteckning här..."
                  rows={4}
                />
              </div>
              {selectedProperties.length > 0 && (
                <div className="space-y-2">
                  <label htmlFor="propertySelect" className="text-sm font-medium">
                    Koppla till fastighet (valfritt)
                  </label>
                  <select
                    id="propertySelect"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    defaultValue=""
                  >
                    <option value="">Hela jämförelsen</option>
                    {selectedProperties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Om du väljer en specifik fastighet kommer anteckningen att kopplas till den fastigheten.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Avbryt
              </Button>
              <Button
                onClick={() => {
                  const propertyId =
                    (document.getElementById("propertySelect") as HTMLSelectElement)?.value || undefined
                  handleAddNote(propertyId)
                }}
                disabled={!noteText.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>Lägg till anteckning</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
