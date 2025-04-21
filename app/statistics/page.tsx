"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer } from "@/components/ui/chart"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/auth-context"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts"

export default function StatisticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [propertyStats, setPropertyStats] = useState<any>(null)
  const [analysisStats, setAnalysisStats] = useState<any>(null)
  const [comparisonStats, setComparisonStats] = useState<any>(null)
  const [preferenceStats, setPreferenceStats] = useState<any>(null)

  useEffect(() => {
    if (!user) return

    const fetchStatistics = async () => {
      setLoading(true)
      try {
        // Fetch saved properties data
        const { data: savedProperties } = await supabase.from("saved_properties").select("*").eq("user_id", user.id)

        // Fetch property analyses data
        const { data: propertyAnalyses } = await supabase
          .from("property_analyses")
          .select("*, saved_properties(*)")
          .in("property_id", savedProperties?.map((p) => p.id) || [])

        // Fetch comparison data
        const { data: comparisons } = await supabase
          .from("property_comparisons")
          .select("*, comparison_properties(*)")
          .eq("user_id", user.id)

        // Fetch user preferences
        const { data: preferences } = await supabase
          .from("user_property_requirements")
          .select("*, property_features(*)")
          .eq("user_id", user.id)

        // Process data for statistics
        processPropertyStats(savedProperties || [])
        processAnalysisStats(propertyAnalyses || [])
        processComparisonStats(comparisons || [])
        processPreferenceStats(preferences || [])
      } catch (error) {
        console.error("Error fetching statistics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [user])

  const processPropertyStats = (properties: any[]) => {
    if (!properties.length) {
      setPropertyStats({
        count: 0,
        priceDistribution: [],
        sizeDistribution: [],
        roomsDistribution: [],
        locationDistribution: [],
        timelineData: [],
      })
      return
    }

    // Count properties
    const count = properties.length

    // Price distribution
    const priceRanges = [
      { name: "< 1M", min: 0, max: 1000000, count: 0 },
      { name: "1-2M", min: 1000000, max: 2000000, count: 0 },
      { name: "2-3M", min: 2000000, max: 3000000, count: 0 },
      { name: "3-5M", min: 3000000, max: 5000000, count: 0 },
      { name: "5-10M", min: 5000000, max: 10000000, count: 0 },
      { name: "> 10M", min: 10000000, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    properties.forEach((property) => {
      const price = property.price || 0
      const range = priceRanges.find((r) => price >= r.min && price < r.max)
      if (range) range.count++
    })

    // Size distribution
    const sizeRanges = [
      { name: "< 50m²", min: 0, max: 50, count: 0 },
      { name: "50-75m²", min: 50, max: 75, count: 0 },
      { name: "75-100m²", min: 75, max: 100, count: 0 },
      { name: "100-150m²", min: 100, max: 150, count: 0 },
      { name: "> 150m²", min: 150, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    properties.forEach((property) => {
      const size = property.size || 0
      const range = sizeRanges.find((r) => size >= r.min && size < r.max)
      if (range) range.count++
    })

    // Rooms distribution
    const roomsCount = [1, 2, 3, 4, 5].map((rooms) => ({
      name: rooms === 5 ? "5+" : rooms.toString(),
      count: properties.filter((p) => (rooms === 5 ? (p.rooms || 0) >= 5 : Math.floor(p.rooms || 0) === rooms)).length,
    }))

    // Location distribution
    const locationMap = properties.reduce((acc: Record<string, number>, property) => {
      const location = property.location?.split(",")[0]?.trim() || "Unknown"
      acc[location] = (acc[location] || 0) + 1
      return acc
    }, {})

    const locationDistribution = Object.entries(locationMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Timeline data
    const timelineData = properties
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .reduce((acc: any[], property, index) => {
        const date = new Date(property.created_at)
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`

        const lastEntry = acc[acc.length - 1]
        if (lastEntry && lastEntry.date === formattedDate) {
          lastEntry.count++
        } else {
          acc.push({
            date: formattedDate,
            count: index + 1, // Cumulative count
          })
        }

        return acc
      }, [])

    setPropertyStats({
      count,
      priceDistribution: priceRanges,
      sizeDistribution: sizeRanges,
      roomsDistribution: roomsCount,
      locationDistribution,
      timelineData,
      analyzedCount: properties.filter((p) => p.is_analyzed).length,
    })
  }

  const processAnalysisStats = (analyses: any[]) => {
    if (!analyses.length) {
      setAnalysisStats({
        count: 0,
        scoreDistribution: [],
        attributeScores: [],
        investmentRatings: [],
      })
      return
    }

    // Count analyses
    const count = analyses.length

    // Score distribution
    const scoreRanges = [
      { name: "0-20", min: 0, max: 20, count: 0 },
      { name: "21-40", min: 20, max: 40, count: 0 },
      { name: "41-60", min: 40, max: 60, count: 0 },
      { name: "61-80", min: 60, max: 80, count: 0 },
      { name: "81-100", min: 80, max: 100, count: 0 },
    ]

    analyses.forEach((analysis) => {
      const score = analysis.total_score || 0
      const range = scoreRanges.find((r) => score > r.min && score <= r.max)
      if (range) range.count++
    })

    // Attribute scores
    const attributeScoresMap: Record<string, number[]> = {}

    analyses.forEach((analysis) => {
      if (analysis.attribute_scores && typeof analysis.attribute_scores === "object") {
        Object.entries(analysis.attribute_scores).forEach(([attribute, score]) => {
          if (!attributeScoresMap[attribute]) {
            attributeScoresMap[attribute] = []
          }
          attributeScoresMap[attribute].push(Number(score))
        })
      }
    })

    const attributeScores = Object.entries(attributeScoresMap).map(([attribute, scores]) => ({
      attribute,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    }))

    // Investment ratings
    const investmentRatings = [
      { name: "Poor", count: 0 },
      { name: "Fair", count: 0 },
      { name: "Good", count: 0 },
      { name: "Excellent", count: 0 },
    ]

    analyses.forEach((analysis) => {
      const rating = analysis.investment_rating
      const ratingObj = investmentRatings.find((r) => r.name.toLowerCase() === rating?.toLowerCase())
      if (ratingObj) ratingObj.count++
    })

    setAnalysisStats({
      count,
      scoreDistribution: scoreRanges,
      attributeScores,
      investmentRatings: investmentRatings.filter((r) => r.count > 0),
    })
  }

  const processComparisonStats = (comparisons: any[]) => {
    if (!comparisons.length) {
      setComparisonStats({
        count: 0,
        timelineData: [],
        mostComparedProperties: [],
      })
      return
    }

    // Count comparisons
    const count = comparisons.length

    // Timeline data
    const timelineData = comparisons
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .reduce((acc: any[], comparison, index) => {
        const date = new Date(comparison.created_at)
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`

        const lastEntry = acc[acc.length - 1]
        if (lastEntry && lastEntry.date === formattedDate) {
          lastEntry.count++
        } else {
          acc.push({
            date: formattedDate,
            count: index + 1, // Cumulative count
          })
        }

        return acc
      }, [])

    // Most compared properties
    const propertyCountMap: Record<string, number> = {}

    comparisons.forEach((comparison) => {
      if (comparison.property_ids && Array.isArray(comparison.property_ids)) {
        comparison.property_ids.forEach((id: string) => {
          propertyCountMap[id] = (propertyCountMap[id] || 0) + 1
        })
      }
    })

    const mostComparedProperties = Object.entries(propertyCountMap)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setComparisonStats({
      count,
      timelineData,
      mostComparedProperties,
      averagePropertiesPerComparison:
        comparisons.reduce((sum, c) => sum + (Array.isArray(c.property_ids) ? c.property_ids.length : 0), 0) / count,
    })
  }

  const processPreferenceStats = (preferences: any[]) => {
    if (!preferences.length) {
      setPreferenceStats({
        count: 0,
        importanceDistribution: [],
        featureDistribution: [],
      })
      return
    }

    // Count preferences
    const count = preferences.length

    // Importance distribution
    const importanceMap: Record<number, number> = {}

    preferences.forEach((pref) => {
      const importance = pref.importance || 0
      importanceMap[importance] = (importanceMap[importance] || 0) + 1
    })

    const importanceDistribution = Object.entries(importanceMap)
      .map(([importance, count]) => ({
        name: `Level ${importance}`,
        count,
      }))
      .sort((a, b) => Number(a.name.split(" ")[1]) - Number(b.name.split(" ")[1]))

    // Feature distribution
    const featureMap: Record<string, number> = {}

    preferences.forEach((pref) => {
      if (pref.property_features?.label) {
        const feature = pref.property_features.label
        featureMap[feature] = (featureMap[feature] || 0) + 1
      }
    })

    const featureDistribution = Object.entries(featureMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setPreferenceStats({
      count,
      importanceDistribution,
      featureDistribution,
    })
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-4">Statistics</h1>
        <p>Please log in to view your statistics.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-2">Property Statistics</h1>
      <p className="text-muted-foreground mb-6">
        Visualizations and insights based on your saved properties and comparisons.
      </p>

      <Tabs defaultValue="properties">
        <TabsList className="mb-6">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[250px] rounded-lg" />
                <Skeleton className="h-[250px] rounded-lg" />
              </div>
            </div>
          ) : !propertyStats ? (
            <div className="text-center py-10">
              <p>No property data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{propertyStats.count}</div>
                    <p className="text-xs text-muted-foreground mt-1">{propertyStats.analyzedCount} analyzed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {new Intl.NumberFormat("sv-SE", {
                        style: "currency",
                        currency: "SEK",
                        maximumFractionDigits: 0,
                      }).format(
                        propertyStats.priceDistribution.reduce(
                          (sum: number, range: any) => sum + ((range.min + range.max) / 2) * range.count,
                          0,
                        ) / propertyStats.count || 0,
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(
                        propertyStats.sizeDistribution.reduce(
                          (sum: number, range: any) => sum + ((range.min + range.max) / 2) * range.count,
                          0,
                        ) / propertyStats.count || 0,
                      )}
                      <span className="text-lg ml-1">m²</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Most Common Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold truncate">
                      {propertyStats.locationDistribution[0]?.name || "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {propertyStats.locationDistribution[0]?.count || 0} properties
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Properties Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Properties Saved Over Time</CardTitle>
                  <CardDescription>Cumulative count of properties saved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        properties: {
                          label: "Properties",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={propertyStats.timelineData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 25,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Properties"
                            stroke="var(--color-properties)"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Price and Size Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Distribution</CardTitle>
                    <CardDescription>Number of properties by price range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ChartContainer
                        config={{
                          price: {
                            label: "Price",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={propertyStats.priceDistribution}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Properties" fill="var(--color-price)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Size Distribution</CardTitle>
                    <CardDescription>Number of properties by size range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ChartContainer
                        config={{
                          size: {
                            label: "Size",
                            color: "hsl(var(--chart-3))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={propertyStats.sizeDistribution}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Properties" fill="var(--color-size)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rooms and Location Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rooms Distribution</CardTitle>
                    <CardDescription>Number of properties by room count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ChartContainer
                        config={{
                          rooms: {
                            label: "Rooms",
                            color: "hsl(var(--chart-4))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={propertyStats.roomsDistribution}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Properties" fill="var(--color-rooms)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Locations</CardTitle>
                    <CardDescription>Most common property locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ChartContainer
                        config={{
                          location: {
                            label: "Location",
                            color: "hsl(var(--chart-5))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={propertyStats.locationDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {propertyStats.locationDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Analyses Tab */}
        <TabsContent value="analyses">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[300px] rounded-lg" />
                <Skeleton className="h-[300px] rounded-lg" />
              </div>
            </div>
          ) : !analysisStats ? (
            <div className="text-center py-10">
              <p>No analysis data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Analyzed Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analysisStats.count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(
                        analysisStats.scoreDistribution.reduce(
                          (sum: number, range: any) => sum + ((range.min + range.max) / 2) * range.count,
                          0,
                        ) / analysisStats.count || 0,
                      )}
                      <span className="text-lg ml-1">/100</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Investment Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analysisStats.investmentRatings.sort((a: any, b: any) => b.count - a.count)[0]?.name || "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analysisStats.investmentRatings.sort((a: any, b: any) => b.count - a.count)[0]?.count || 0}{" "}
                      properties
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Score Distribution and Investment Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>Number of properties by score range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          score: {
                            label: "Score",
                            color: "hsl(var(--chart-6))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analysisStats.scoreDistribution}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Properties" fill="var(--color-score)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Investment Ratings</CardTitle>
                    <CardDescription>Distribution of investment ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          rating: {
                            label: "Rating",
                            color: "hsl(var(--chart-7))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analysisStats.investmentRatings}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {analysisStats.investmentRatings.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attribute Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Attribute Scores</CardTitle>
                  <CardDescription>Average scores across different property attributes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ChartContainer
                      config={{
                        attributes: {
                          label: "Attributes",
                          color: "hsl(var(--chart-8))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%">
                          <PolarGrid />
                          <PolarAngleAxis dataKey="attribute" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="Average Score"
                            dataKey="averageScore"
                            data={analysisStats.attributeScores}
                            fill="var(--color-attributes)"
                            fillOpacity={0.6}
                          />
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Comparisons Tab */}
        <TabsContent value="comparisons">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          ) : !comparisonStats ? (
            <div className="text-center py-10">
              <p>No comparison data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Comparisons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{comparisonStats.count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Properties Per Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {comparisonStats.averagePropertiesPerComparison?.toFixed(1) || "0"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Most Compared Property</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold truncate">
                      ID: {comparisonStats.mostComparedProperties[0]?.id || "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used in {comparisonStats.mostComparedProperties[0]?.count || 0} comparisons
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparisons Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparisons Over Time</CardTitle>
                  <CardDescription>Cumulative count of comparisons created</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        comparisons: {
                          label: "Comparisons",
                          color: "hsl(var(--chart-9))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={comparisonStats.timelineData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 25,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Comparisons"
                            stroke="var(--color-comparisons)"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Most Compared Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Compared Properties</CardTitle>
                  <CardDescription>Properties that appear in the most comparisons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        property: {
                          label: "Property",
                          color: "hsl(var(--chart-10))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparisonStats.mostComparedProperties.map((p: any) => ({
                            id: p.id,
                            count: p.count,
                          }))}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="id"
                            width={100}
                            tickFormatter={(value) => `ID: ${value.substring(0, 8)}...`}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Times Compared" fill="var(--color-property)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[300px] rounded-lg" />
                <Skeleton className="h-[300px] rounded-lg" />
              </div>
            </div>
          ) : !preferenceStats ? (
            <div className="text-center py-10">
              <p>No preference data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{preferenceStats.count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Most Important Feature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold truncate">
                      {preferenceStats.featureDistribution[0]?.name || "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {preferenceStats.featureDistribution[0]?.count || 0} preferences
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Importance and Feature Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Importance Distribution</CardTitle>
                    <CardDescription>Distribution of preference importance levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          importance: {
                            label: "Importance",
                            color: "hsl(var(--chart-11))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={preferenceStats.importanceDistribution}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Preferences" fill="var(--color-importance)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Feature Distribution</CardTitle>
                    <CardDescription>Most common preference features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          feature: {
                            label: "Feature",
                            color: "hsl(var(--chart-12))",
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={preferenceStats.featureDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {preferenceStats.featureDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
