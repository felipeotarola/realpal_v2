"use client"

import { CrawlerForm } from "@/components/crawler-form"
import { useAuth } from "@/contexts/auth-context"
import { Suspense, useEffect, useState } from "react"
import { ChatDrawer } from "@/components/chat-drawer"
import { ProtectedRoute } from "@/components/protected-route"
import { Building, Search, BarChart2, Clock, ExternalLink, Home, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"

type SavedProperty = {
  id: string
  user_id: string
  title: string
  price: string
  location: string
  images: string[]
  created_at: string
  is_analyzed: boolean
}

function DashboardContent() {
  const { user } = useAuth()
  const [recentProperties, setRecentProperties] = useState<SavedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentProperties() {
      if (!user) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from("saved_properties")
          .select("id, user_id, title, price, location, images, created_at, is_analyzed")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        setRecentProperties(data)
      } catch (error) {
        console.error("Error fetching recent properties:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchRecentProperties()
    }
  }, [user])

  const popularSites = [
    { name: "Hemnet", url: "https://www.hemnet.se", color: "bg-green-100 text-green-600" },
    { name: "Booli", url: "https://www.booli.se", color: "bg-blue-100 text-blue-600" },
    { name: "Blocket Bostad", url: "https://www.blocket.se/bostad", color: "bg-yellow-100 text-yellow-600" },
    { name: "Svensk Fastighetsförmedling", url: "https://www.svenskfast.se", color: "bg-red-100 text-red-600" },
    { name: "Fastighetsbyrån", url: "https://www.fastighetsbyran.se", color: "bg-purple-100 text-purple-600" },
  ]

  async function handleDeleteProperty(id: string) {
    if (!confirm("Är du säker på att du vill ta bort denna fastighet från din sparade lista?")) {
      return
    }

    try {
      const { error } = await supabase.from("saved_properties").delete().eq("id", id).eq("user_id", user?.id)
      if (error) throw error
      setRecentProperties((prev) => prev.filter((property) => property.id !== id))
    } catch (error) {
      console.error("Error deleting property:", error)
    }
  }

  // Helper function to format currency
  const formatCurrency = (price: string) => {
    // Try to extract numeric value and format it
    const numericValue = price.replace(/[^\d]/g, "")
    if (numericValue && !isNaN(Number(numericValue))) {
      return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(Number(numericValue))
    }
    return price
  }

  // Format date in a more compact way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("sv-SE", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">Fastighetsanalys</h1>
      <p className="text-center text-gray-500 mb-8">
        {`Välkommen ${user?.email?.split("@")[0] || "Användare"}! Analysera och organisera fastigheter du är intresserad av.`}
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-lg">Analysera</h2>
          </div>
          <p className="text-gray-600">
            Lägg till en fastighet för att få en detaljerad analys av dess egenskaper och potential.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-full">
              <BarChart2 className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="font-bold text-lg">Jämför</h2>
          </div>
          <p className="text-gray-600">
            Jämför olika fastigheter sida vid sida för att se vilken som bäst matchar dina behov.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-full">
              <Building className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-bold text-lg">Spara</h2>
          </div>
          <p className="text-gray-600">
            Spara dina favoriter och organisera dem för att enkelt kunna återkomma till dem senare.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="max-w-3xl">
            <CrawlerForm />
          </div>

          {/* Recent Properties - Responsive List */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <h2 className="text-xl font-semibold">Senast sparade</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/saved">Visa alla</Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Laddar...</div>
            ) : recentProperties.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {recentProperties.map((property) => (
                      <li key={property.id} className="relative">
                        <Link
                          href={`/property/${property.id}`}
                          className="block py-3 px-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            {/* Thumbnail - Hidden on very small screens */}
                            <div className="hidden xs:block w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              {property.images && property.images.length > 0 ? (
                                <img
                                  src={property.images[0] || "/placeholder.svg"}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = "/suburban-house-exterior.png"
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Main content - Flexible width */}
                            <div className="min-w-0 flex-grow xs:ml-3">
                              <div className="font-medium text-sm truncate pr-8">{property.title}</div>
                              <div className="flex flex-wrap items-center text-xs text-gray-500 gap-x-2">
                                <span className="truncate max-w-[120px]">{property.location}</span>
                                <span className="text-blue-600 font-medium">
                                  {formatCurrency(property.price).replace(/(\d) (\d)/g, "$1\u00A0$2")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Delete button - Absolute positioned */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteProperty(property.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Ta bort</span>
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-gray-500">
                  Du har inga sparade fastigheter. Börja med att söka på en fastighet ovan.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold">Snabblänkar</h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-gray-600 mb-4">Populära fastighetswebbplatser</p>

            <div className="space-y-3">
              {popularSites.map((site) => (
                <a
                  key={site.name}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${site.color}`}>
                    <Home className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{site.name}</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />
                </a>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="font-medium mb-3">Användbara resurser</h3>
              <div className="space-y-2">
                <a
                  href="https://www.lantmateriet.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Lantmäteriet</span>
                </a>
                <a
                  href="https://www.maklarstatistik.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Mäklarstatistik</span>
                </a>
                <a
                  href="https://www.bolagsverket.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Bolagsverket</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-xl p-5 border border-blue-100">
            <h3 className="font-medium text-blue-800 mb-2">Tips för bostadsköp</h3>
            <p className="text-blue-700 text-sm mb-3">Kom ihåg att kontrollera dessa viktiga punkter innan du köper:</p>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <div className="min-w-4 mt-0.5">•</div>
                <span>Kontrollera föreningens ekonomi och årsredovisning</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="min-w-4 mt-0.5">•</div>
                <span>Undersök kommande renoveringar och avgiftshöjningar</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="min-w-4 mt-0.5">•</div>
                <span>Besök området vid olika tider på dygnet</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="min-w-4 mt-0.5">•</div>
                <span>Kontrollera närhet till kommunikationer och service</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ChatDrawer />
    </main>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="container mx-auto py-10 px-4 text-center">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  )
}
