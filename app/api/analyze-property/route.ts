import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"
import { calculatePropertyMatchScore } from "@/lib/property-scoring"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 sekunder timeout

// Definiera attribut som ska bedömas
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
  userId?: string // Lägg till användar-ID för att hämta preferenser
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
}

export async function POST(request: Request) {
  try {
    const propertyData: PropertyAnalysisRequest = await request.json()

    // Validera indata
    if (!propertyData.description || !propertyData.title) {
      return NextResponse.json({ error: "Ofullständig fastighetsdata" }, { status: 400 })
    }

    // Hämta användarpreferenser om användar-ID finns
    let userPreferences = null
    let features = []

    if (propertyData.userId) {
      // Hämta användarpreferenser
      const { data: preferences, error: prefError } = await supabase
        .from("user_property_requirements")
        .select("feature_id, value, importance")
        .eq("user_id", propertyData.userId)

      if (prefError) {
        console.error("Error fetching user preferences:", prefError)
      } else if (preferences && preferences.length > 0) {
        // Hämta egenskapsinformation
        const { data: featureData, error: featError } = await supabase.from("property_features").select("*")

        if (featError) {
          console.error("Error fetching features:", featError)
        } else {
          features = featureData || []

          // Formatera preferenser för matchningsberäkning
          userPreferences = preferences.reduce((acc, pref) => {
            const value = pref.value.value !== undefined ? pref.value.value : pref.value
            acc[pref.feature_id] = {
              value,
              importance: pref.importance,
            }
            return acc
          }, {})
        }
      }
    }

    // Analysera fastigheten med OpenAI
    const analysis = await analyzePropertyWithAI(propertyData, userPreferences)

    // Beräkna matchning med användarpreferenser om tillgängligt
    if (userPreferences && features.length > 0) {
      // Skapa en mappning av fastighetens egenskaper
      const propertyFeatures: Record<string, any> = {
        rooms: Number.parseInt(propertyData.rooms) || 0,
        size: Number.parseInt(propertyData.size) || 0,
      }

      // Lägg till booleanska egenskaper baserat på features-array
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

      // Kontrollera om egenskaper finns i features-array
      Object.entries(featureKeywords).forEach(([swedish, english]) => {
        const hasFeature = propertyData.features.some(
          (feature) => feature.toLowerCase().includes(swedish) || feature.toLowerCase().includes(english),
        )
        propertyFeatures[english] = hasFeature
      })

      // Beräkna matchningspoäng
      const matchResult = calculatePropertyMatchScore(propertyFeatures, userPreferences, features)

      // Lägg till matchningsresultat till analysen
      analysis.preferenceMatch = {
        score: matchResult.score,
        percentage: matchResult.percentage,
        matches: matchResult.matches,
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing property:", error)
    return NextResponse.json({ error: "Kunde inte analysera fastigheten" }, { status: 500 })
  }
}

async function analyzePropertyWithAI(
  property: PropertyAnalysisRequest,
  userPreferences?: Record<string, { value: any; importance: number }> | null,
): Promise<PropertyAnalysisResponse> {
  // Skapa en prompt för OpenAI
  let prompt = `
Du är en erfaren fastighetsvärderare och inredningsarkitekt med expertis inom fastighetsanalys.
Analysera följande fastighet och ge betyg (1-10) för varje attribut samt en kort kommentar.

FASTIGHETSINFORMATION:
Titel: ${property.title}
Plats: ${property.location}
Pris: ${property.price}
Storlek: ${property.size}
Antal rum: ${property.rooms}
${property.yearBuilt ? `Byggår: ${property.yearBuilt}` : ""}
${property.monthlyFee ? `Månadsavgift: ${property.monthlyFee}` : ""}

BESKRIVNING:
${property.description}

EGENSKAPER:
${property.features.join(", ")}

BILDER:
${property.images.length} bilder finns tillgängliga (men kan inte visas i denna prompt).

ATTRIBUT ATT BEDÖMA (skala 1-10):
${ATTRIBUTES.map((attr) => `- ${attr.name}: ${attr.description}`).join("\n")}
`

  // Lägg till användarpreferenser om tillgängliga
  if (userPreferences && Object.keys(userPreferences).length > 0) {
    prompt += `
ANVÄNDARPREFERENSER:
Följande är användarens preferenser som du bör ta hänsyn till i din analys:
`

    // Gruppera preferenser efter viktighet
    const importanceLabels = ["Inte viktigt", "Trevligt att ha", "Ganska viktigt", "Mycket viktigt", "Måste ha"]

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
Ta särskild hänsyn till "Måste ha" och "Mycket viktigt" preferenser i din analys.
Ge lägre betyg för attribut som inte uppfyller användarens viktiga preferenser.
`
  }

  prompt += `
Ge också:
1. En kort sammanfattning av fastigheten (max 3 meningar)
2. Tre fördelar med fastigheten
3. Tre nackdelar eller saker att tänka på
4. Ett investeringsbetyg (1-10) som indikerar om detta är en bra investering
5. Ett prisvärdhet-betyg (1-10) som indikerar om priset är rimligt för vad man får

Svara ENDAST i följande JSON-format:
{
  "summary": "Kort sammanfattning av fastigheten",
  "totalScore": 7.5, // Genomsnittligt betyg av alla attribut
  "attributes": [
    { "name": "ljus", "score": 8, "comment": "Gott om naturligt ljus från stora fönster" },
    // ... resten av attributen
  ],
  "pros": ["Fördel 1", "Fördel 2", "Fördel 3"],
  "cons": ["Nackdel 1", "Nackdel 2", "Nackdel 3"],
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

    // Extrahera JSON från svaret
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Kunde inte extrahera JSON från AI-svaret")
    }

    const analysisResult = JSON.parse(jsonMatch[0]) as PropertyAnalysisResponse
    return analysisResult
  } catch (error) {
    console.error("Error in AI analysis:", error)
    // Returnera ett standardsvar om något går fel
    return {
      summary: "Kunde inte analysera fastigheten automatiskt.",
      totalScore: 5,
      attributes: ATTRIBUTES.map((attr) => ({
        name: attr.name,
        score: 5,
        comment: "Ingen analys tillgänglig",
      })),
      pros: ["Ingen automatisk analys tillgänglig"],
      cons: ["Ingen automatisk analys tillgänglig"],
      investmentRating: 5,
      valueForMoney: 5,
    }
  }
}
