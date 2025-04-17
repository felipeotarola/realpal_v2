import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 60 sekunder timeout

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
}

export async function POST(request: Request) {
  try {
    const propertyData: PropertyAnalysisRequest = await request.json()

    // Validera indata
    if (!propertyData.description || !propertyData.title) {
      return NextResponse.json({ error: "Ofullständig fastighetsdata" }, { status: 400 })
    }

    // Analysera fastigheten med OpenAI
    const analysis = await analyzePropertyWithAI(propertyData)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing property:", error)
    return NextResponse.json({ error: "Kunde inte analysera fastigheten" }, { status: 500 })
  }
}

async function analyzePropertyWithAI(property: PropertyAnalysisRequest): Promise<PropertyAnalysisResponse> {
  // Skapa en prompt för OpenAI
  const prompt = `
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
