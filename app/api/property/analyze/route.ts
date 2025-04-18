import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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

export async function POST(request: Request) {
  try {
    const { propertyId, userId, propertyData } = await request.json()

    if (!propertyId || !userId || !propertyData) {
      return NextResponse.json({ error: "Obligatoriska data saknas" }, { status: 400 })
    }

    // Skapa en prompt för OpenAI på svenska
    const prompt = `
Du är en erfaren svensk fastighetsvärderare och inredningsarkitekt med expertis inom fastighetsanalys.
Analysera följande fastighet och ge betyg (1-10) för varje attribut samt en kort kommentar på svenska.

FASTIGHETSINFORMATION:
Titel: ${propertyData.title}
Plats: ${propertyData.location}
Pris: ${propertyData.price}
Storlek: ${propertyData.size}
Antal rum: ${propertyData.rooms}
${propertyData.year_built ? `Byggår: ${propertyData.year_built}` : ""}
${propertyData.monthly_fee ? `Månadsavgift: ${propertyData.monthly_fee}` : ""}

BESKRIVNING:
${propertyData.description}

EGENSKAPER:
${propertyData.features.join(", ")}

BILDER:
${propertyData.images.length} bilder finns tillgängliga (men kan inte visas i denna prompt).

ATTRIBUT ATT BEDÖMA (skala 1-10):
${ATTRIBUTES.map((attr) => `- ${attr.name}: ${attr.description}`).join("\n")}

Ge också:
1. En kort sammanfattning av fastigheten på svenska (max 3 meningar)
2. Tre fördelar med fastigheten på svenska
3. Tre nackdelar eller saker att tänka på på svenska
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

VIKTIGT: Alla texter ska vara på svenska. Använd svenska termer och uttryck som är relevanta för fastighetsmarknaden.
`

    // Generera analys med OpenAI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 2000,
    })

    // Extrahera JSON från svaret
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Kunde inte extrahera JSON från AI-svaret" }, { status: 500 })
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    // Returnera analysresultatet utan att spara i databasen
    return NextResponse.json({
      message: "Analys slutförd",
      analysis: {
        property_id: propertyId,
        analysis_summary: analysisResult.summary,
        total_score: analysisResult.totalScore,
        attribute_scores: analysisResult.attributes,
        pros: analysisResult.pros,
        cons: analysisResult.cons,
        investment_rating: analysisResult.investmentRating,
        value_for_money: analysisResult.valueForMoney,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Fel vid analys av fastighet:", error)
    return NextResponse.json({ error: "Kunde inte analysera fastigheten" }, { status: 500 })
  }
}
