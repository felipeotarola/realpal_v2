import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"
import { calculatePropertyMatchScore } from "@/lib/property-scoring"
// Import the Tavily search function at the top of the file
import { searchBrokerInfo } from "@/lib/tavily-search"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 seconds timeout

// Define attributes to be assessed
const ATTRIBUTES = [
  { name: "ljus", description: "Mängden naturligt ljus i bostaden" },
  { name: "planlösning", description: "Hur väl planerad och funktionell planlösningen är" },
  { name: "skick", description: "Bostadens allmänna skick och renoveringsbehov" },
  { name: "läge", description: "Områdets attraktivitet och närhet till service" },
  { name: "potential", description: "Potential för värdeökning eller förbättring" },
  { name: "köket", description: "Kökets kvalitet, storlek och funktionalitet" },
  { name: "badrum", description: "Badrummets kvalitet, storlek och funktionalitet" },
  { name: "förvaring", description: "Förvaringsmöjligheter i bostaden" },
  { name: "balkong", description: "Balkongens storlek, läge och användbarhet (om tillämpligt)" },
]

interface PropertyAnalysisRequest {
  title: string
  description: string
  features: string[]
  images: string[]
  price: string
  size: string
  rooms: string
  location: string
  yearBuilt?: string
  monthlyFee?: string
  userId?: string
  agent?: string
}

interface AttributeScore {
  name: string
  score: number // 1-10
  comment: string
}

interface PropertyAnalysisResponse {
  summary: string
  totalScore: number
  attributes: AttributeScore[]
  pros: string[]
  cons: string[]
  investmentRating: number // 1-10
  valueForMoney: number // 1-10
  preferenceMatch?: {
    score: number
    percentage: number
    matches: Record<string, { matched: boolean; importance: number; featureLabel: string }>
  }
  brokerInfo?: {
    name: string
    searchResults: any[]
    searchQuery: string
  }
}

export async function POST(request: Request) {
  try {
    const propertyData: PropertyAnalysisRequest = await request.json()

    // Validate input data
    if (!propertyData.description || !propertyData.title) {
      return NextResponse.json({ error: "Incomplete property data" }, { status: 400 })
    }

    // Fetch user preferences if userId is provided
    let userPreferences = null
    let features = []
    let preferenceMatch = null

    if (propertyData.userId) {
      console.log(`🔍 Fetching preferences for user: ${propertyData.userId}`)

      // Fetch user preferences
      const { data: preferences, error: prefError } = await supabase
        .from("user_property_requirements")
        .select("feature_id, value, importance")
        .eq("user_id", propertyData.userId)

      if (prefError) {
        console.error("Error fetching user preferences:", prefError)
      } else if (preferences && preferences.length > 0) {
        console.log(`✅ Found ${preferences.length} preferences for user`)

        // Fetch feature information
        const { data: featureData, error: featError } = await supabase.from("property_features").select("*")

        if (featError) {
          console.error("Error fetching features:", featError)
        } else {
          features = featureData || []
          console.log(`✅ Found ${features.length} feature definitions`)

          // Format preferences for match calculation
          userPreferences = preferences.reduce((acc, pref) => {
            // Extract the actual value from the JSONB structure
            const value =
              pref.value && typeof pref.value === "object" && "value" in pref.value ? pref.value.value : pref.value

            acc[pref.feature_id] = {
              value,
              importance: pref.importance,
            }
            return acc
          }, {})

          console.log("Formatted user preferences:", userPreferences)
        }
      } else {
        console.log("⚠️ No preferences found for user")
      }
    }

    // Analyze the property with OpenAI
    const analysis = await analyzePropertyWithAI(propertyData, userPreferences)

    // Calculate match with user preferences if available
    if (userPreferences && features.length > 0) {
      console.log("🧮 Calculating preference match score")

      // Create a mapping of property features
      const propertyFeatures: Record<string, any> = {
        rooms: Number.parseInt(propertyData.rooms) || 0,
        size: Number.parseInt(propertyData.size) || 0,
      }

      // Log the property features we're using for matching
      console.log("Property features for matching:", propertyFeatures)

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
        const hasFeature = propertyData.features.some(
          (feature) => feature.toLowerCase().includes(swedish) || feature.toLowerCase().includes(english),
        )
        propertyFeatures[english] = hasFeature
        console.log(`Feature ${english}: ${hasFeature ? "Yes" : "No"}`)
      })

      // Calculate match score
      const matchResult = calculatePropertyMatchScore(propertyFeatures, userPreferences, features)
      console.log(`✅ Preference match calculation complete: ${matchResult.percentage}%`)
      console.log("Match details:", matchResult.matches)

      // Add match result to the analysis
      preferenceMatch = {
        score: matchResult.score,
        percentage: matchResult.percentage,
        matches: matchResult.matches,
      }

      // Add preference match to analysis
      analysis.preferenceMatch = preferenceMatch
    }

    // Search for broker information if available
    if (propertyData.agent) {
      console.log(`🔍 Searching for broker information: ${propertyData.agent}`)
      const brokerInfo = await searchBrokerInfo(propertyData.agent, propertyData.location)
      if (brokerInfo) {
        console.log(`✅ Found broker information with ${brokerInfo.results?.length || 0} results`)
        analysis.brokerInfo = {
          name: propertyData.agent,
          searchResults: brokerInfo.results,
          searchQuery: brokerInfo.searchQuery,
        }
      } else {
        console.log("❌ No broker information found")
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing property:", error)
    return NextResponse.json({ error: "Could not analyze the property" }, { status: 500 })
  }
}

async function analyzePropertyWithAI(
  property: PropertyAnalysisRequest,
  userPreferences?: Record<string, { value: any; importance: number }> | null,
): Promise<PropertyAnalysisResponse> {
  // Create a prompt for OpenAI
  let prompt = `
You are an experienced real estate appraiser and interior architect with expertise in property analysis.
Analyze the following property and give ratings (1-10) for each attribute along with a brief comment.

PROPERTY INFORMATION:
Title: ${property.title}
Location: ${property.location}
Price: ${property.price}
Size: ${property.size}
Number of rooms: ${property.rooms}
${property.yearBuilt ? `Year built: ${property.yearBuilt}` : ""}
${property.monthlyFee ? `Monthly fee: ${property.monthlyFee}` : ""}

DESCRIPTION:
${property.description}

FEATURES:
${property.features.join(", ")}

IMAGES:
${property.images.length} images are available (but cannot be shown in this prompt).

ATTRIBUTES TO ASSESS (scale 1-10):
${ATTRIBUTES.map((attr) => `- ${attr.name}: ${attr.description}`).join("\n")}
`

  // Add user preferences if available
  if (userPreferences && Object.keys(userPreferences).length > 0) {
    prompt += `
USER PREFERENCES:
The following are the user's preferences that you should consider in your analysis:
`

    // Group preferences by importance
    const importanceLabels = ["Not important", "Nice to have", "Somewhat important", "Very important", "Must have"]

    for (let importance = 4; importance >= 1; importance--) {
      const prefsAtImportance = Object.entries(userPreferences).filter(([_, { importance: imp }]) => imp === importance)

      if (prefsAtImportance.length > 0) {
        prompt += `\n${importanceLabels[importance]}:\n`

        prefsAtImportance.forEach(([featureId, { value }]) => {
          prompt += `- ${featureId}: ${value}\n`
        })
      }
    }

    prompt += `
Pay special attention to "Must have" and "Very important" preferences in your analysis.
Give lower ratings for attributes that do not meet the user's important preferences.
`
  }

  prompt += `
Also provide:
1. A brief summary of the property (max 3 sentences)
2. Three advantages of the property
3. Three disadvantages or things to consider
4. An investment rating (1-10) indicating if this is a good investment
5. A value-for-money rating (1-10) indicating if the price is reasonable for what you get

Respond ONLY in the following JSON format:
{
  "summary": "Brief summary of the property",
  "totalScore": 7.5, // Average rating of all attributes
  "attributes": [
    { "name": "ljus", "score": 8, "comment": "Plenty of natural light from large windows" },
    // ... rest of the attributes
  ],
  "pros": ["Advantage 1", "Advantage 2", "Advantage 3"],
  "cons": ["Disadvantage 1", "Disadvantage 2", "Disadvantage 3"],
  "investmentRating": 7,
  "valueForMoney": 6
}
`

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 2000,
    })

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response")
    }

    const analysisResult = JSON.parse(jsonMatch[0]) as PropertyAnalysisResponse
    return analysisResult
  } catch (error) {
    console.error("Error in AI analysis:", error)
    // Return a default response if something goes wrong
    return {
      summary: "Could not analyze the property automatically.",
      totalScore: 5,
      attributes: ATTRIBUTES.map((attr) => ({
        name: attr.name,
        score: 5,
        comment: "No analysis available",
      })),
      pros: ["No automatic analysis available"],
      cons: ["No automatic analysis available"],
      investmentRating: 5,
      valueForMoney: 5,
      brokerInfo: undefined,
    }
  }
}
