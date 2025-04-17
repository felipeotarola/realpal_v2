import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 120 sekunder timeout

interface ComparisonAnalysisRequest {
  comparisonId: string
  userId: string
}

export async function POST(request: Request) {
  try {
    const { comparisonId, userId } = await request.json()

    if (!comparisonId || !userId) {
      return NextResponse.json({ error: "Jämförelse-ID och användar-ID krävs" }, { status: 400 })
    }

    // Hämta jämförelsen från databasen
    const { data: comparison, error: comparisonError } = await supabase
      .from("property_comparisons")
      .select("*")
      .eq("id", comparisonId)
      .eq("user_id", userId)
      .single()

    if (comparisonError || !comparison) {
      return NextResponse.json({ error: comparisonError?.message || "Jämförelsen hittades inte" }, { status: 404 })
    }

    // Kontrollera om jämförelsen redan har analyserats
    if (comparison.ai_analysis) {
      return NextResponse.json({
        message: "Jämförelsen har redan analyserats",
        alreadyAnalyzed: true,
        analysis: comparison.ai_analysis,
      })
    }

    // Hämta alla fastigheter som ingår i jämförelsen
    const { data: properties, error: propertiesError } = await supabase
      .from("saved_properties")
      .select("*")
      .in("id", comparison.property_ids)
      .eq("user_id", userId)

    if (propertiesError || !properties || properties.length === 0) {
      return NextResponse.json({ error: "Kunde inte hämta fastigheterna för jämförelse" }, { status: 500 })
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

    // Analysera fastigheterna med OpenAI
    const analysis = await comparePropertiesWithAI(propertiesWithAnalysis, comparison.title)

    // Uppdatera jämförelsen med analysresultat
    const { error: updateError } = await supabase
      .from("property_comparisons")
      .update({
        ai_analysis: analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comparisonId)
      .eq("user_id", userId)

    if (updateError) {
      console.error("Error updating comparison with analysis:", updateError)
      return NextResponse.json({ error: "Kunde inte uppdatera jämförelsen med analys" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Jämförelsen har analyserats",
      analysis,
    })
  } catch (error) {
    console.error("Error analyzing comparison:", error)
    return NextResponse.json({ error: "Kunde inte analysera jämförelsen" }, { status: 500 })
  }
}

async function comparePropertiesWithAI(properties: any[], comparisonTitle: string) {
  // Skapa en prompt för OpenAI
  const prompt = `
Du är en erfaren fastighetsvärderare och inredningsarkitekt med expertis inom fastighetsjämförelser.
Jämför följande ${properties.length} fastigheter och ge en detaljerad analys av deras skillnader, styrkor och svagheter.

JÄMFÖRELSETITEL: ${comparisonTitle}

${properties
  .map(
    (property, index) => `
FASTIGHET ${index + 1}: ${property.title}
Plats: ${property.location}
Pris: ${property.price}
Storlek: ${property.size}
Antal rum: ${property.rooms}
${property.year_built ? `Byggår: ${property.year_built}` : ""}
${property.monthly_fee ? `Månadsavgift: ${property.monthly_fee}` : ""}
Beskrivning: ${property.description.substring(0, 300)}...
Egenskaper: ${property.features.join(", ")}
${
  property.analysis
    ? `
Totalpoäng: ${property.analysis.total_score}
Fördelar: ${property.analysis.pros.join(", ")}
Nackdelar: ${property.analysis.cons.join(", ")}
`
    : ""
}
`,
  )
  .join("\n")}

Ge en detaljerad jämförelse som inkluderar:

1. En sammanfattning av de viktigaste skillnaderna mellan fastigheterna
2. En jämförelsetabell med poäng (1-10) för varje fastighet inom följande kategorier:
   - Prisvärdhet
   - Läge
   - Skick
   - Planlösning
   - Potential
   - Totalt värde
3. Specifika för- och nackdelar med varje fastighet jämfört med de andra
4. En rekommendation om vilken fastighet som verkar vara det bästa valet och varför
5. Viktiga faktorer att överväga vid valet mellan dessa fastigheter

Svara ENDAST i följande JSON-format:
{
  "summary": "En sammanfattning av jämförelsen",
  "comparisonTable": [
    {
      "category": "Kategorinamn",
      "description": "Kort beskrivning av kategorin",
      "scores": [
        {"propertyIndex": 0, "score": 8, "comment": "Kommentar för fastighet 1"},
        {"propertyIndex": 1, "score": 7, "comment": "Kommentar för fastighet 2"},
        ...
      ]
    },
    ...
  ],
  "propertyComparisons": [
    {
      "propertyIndex": 0,
      "strengths": ["Styrka 1", "Styrka 2", ...],
      "weaknesses": ["Svaghet 1", "Svaghet 2", ...],
      "uniqueFeatures": ["Unik egenskap 1", ...]
    },
    ...
  ],
  "recommendation": {
    "bestChoice": 0, // Index för den rekommenderade fastigheten
    "reasoning": "Förklaring till rekommendationen"
  },
  "keyConsiderations": ["Faktor 1", "Faktor 2", ...]
}
`

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 3000,
    })

    // Extrahera JSON från svaret
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Kunde inte extrahera JSON från AI-svaret")
    }

    const analysisResult = JSON.parse(jsonMatch[0])
    return analysisResult
  } catch (error) {
    console.error("Error in AI comparison:", error)
    // Returnera ett standardsvar om något går fel
    return {
      summary: "Kunde inte analysera jämförelsen automatiskt.",
      comparisonTable: [
        {
          category: "Totalt värde",
          description: "Övergripande värdering",
          scores: properties.map((_, index) => ({
            propertyIndex: index,
            score: 5,
            comment: "Ingen analys tillgänglig",
          })),
        },
      ],
      propertyComparisons: properties.map((_, index) => ({
        propertyIndex: index,
        strengths: ["Ingen automatisk analys tillgänglig"],
        weaknesses: ["Ingen automatisk analys tillgänglig"],
        uniqueFeatures: [],
      })),
      recommendation: {
        bestChoice: null,
        reasoning: "Kunde inte göra en automatisk rekommendation",
      },
      keyConsiderations: ["Jämför fastigheterna manuellt för bästa resultat"],
    }
  }
}
