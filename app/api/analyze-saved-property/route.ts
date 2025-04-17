import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"

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
  propertyId: string
  userId: string
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
    const { propertyId, userId } = await request.json()

    if (!propertyId || !userId) {
      return NextResponse.json({ error: "Fastighets-ID och användar-ID krävs" }, { status: 400 })
    }

    // Hämta fastighetsdata från databasen
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("id", propertyId)
      .eq("user_id", userId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: propertyError?.message || "Fastigheten hittades inte" }, { status: 404 })
    }

    // Kontrollera om fastigheten redan har analyserats
    if (property.is_analyzed) {
      // Hämta befintlig analys
      const { data: existingAnalysis, error: analysisError } = await supabase
        .from("property_analyses")
        .select("*")
        .eq("property_id", propertyId)
        .single()

      if (analysisError) {
        console.error("Error fetching existing analysis:", analysisError)
        // Om vi inte kan hämta analysen, fortsätt med att skapa en ny
      } else if (existingAnalysis) {
        return NextResponse.json({
          message: "Fastigheten har redan analyserats",
          alreadyAnalyzed: true,
          analysis: {
            summary: existingAnalysis.analysis_summary,
            totalScore: existingAnalysis.total_score,
            attributes: existingAnalysis.attribute_scores,
            pros: existingAnalysis.pros,
            cons: existingAnalysis.cons,
            investmentRating: existingAnalysis.investment_rating,
            valueForMoney: existingAnalysis.value_for_money,
          },
        })
      }
    }

    // Analysera fastigheten med OpenAI
    const analysis = await analyzePropertyWithAI({
      title: property.title,
      description: property.description,
      features: property.features,
      images: property.images,
      price: property.price,
      size: property.size,
      rooms: property.rooms,
      location: property.location,
      yearBuilt: property.year_built,
      monthlyFee: property.monthly_fee,
    })

    // Börja en transaktion för att uppdatera båda tabellerna
    // Steg 1: Uppdatera is_analyzed-flaggan i saved_properties
    const { error: updatePropertyError } = await supabase
      .from("saved_properties")
      .update({ is_analyzed: true })
      .eq("id", propertyId)
      .eq("user_id", userId)

    if (updatePropertyError) {
      console.error("Error updating property is_analyzed flag:", updatePropertyError)
      return NextResponse.json({ error: "Kunde inte uppdatera fastigheten" }, { status: 500 })
    }

    // Steg 2: Skapa eller uppdatera analysen i property_analyses
    // Kontrollera först om det redan finns en analys (för säkerhets skull)
    const { data: existingAnalysis, error: checkError } = await supabase
      .from("property_analyses")
      .select("id")
      .eq("property_id", propertyId)
      .maybeSingle()

    let analysisResult

    if (existingAnalysis) {
      // Uppdatera befintlig analys
      const { data, error: updateError } = await supabase
        .from("property_analyses")
        .update({
          analysis_summary: analysis.summary,
          total_score: analysis.totalScore,
          attribute_scores: analysis.attributes,
          pros: analysis.pros,
          cons: analysis.cons,
          investment_rating: analysis.investmentRating,
          value_for_money: analysis.valueForMoney,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnalysis.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating analysis:", updateError)
        return NextResponse.json({ error: "Kunde inte uppdatera analysen" }, { status: 500 })
      }

      analysisResult = data
    } else {
      // Skapa ny analys
      const { data, error: insertError } = await supabase
        .from("property_analyses")
        .insert({
          property_id: propertyId,
          analysis_summary: analysis.summary,
          total_score: analysis.totalScore,
          attribute_scores: analysis.attributes,
          pros: analysis.pros,
          cons: analysis.cons,
          investment_rating: analysis.investmentRating,
          value_for_money: analysis.valueForMoney,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error inserting analysis:", insertError)
        return NextResponse.json({ error: "Kunde inte spara analysen" }, { status: 500 })
      }

      analysisResult = data
    }

    return NextResponse.json({
      message: "Fastigheten har analyserats",
      analysis,
      analysisId: analysisResult.id,
    })
  } catch (error) {
    console.error("Error analyzing property:", error)
    return NextResponse.json({ error: "Kunde inte analysera fastigheten" }, { status: 500 })
  }
}

async function analyzePropertyWithAI(property: any): Promise<PropertyAnalysisResponse> {
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
