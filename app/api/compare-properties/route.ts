import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"
import { calculatePropertyMatchScore } from "@/lib/property-scoring"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: Request) {
  try {
    const { properties, userId } = await request.json()

    if (!properties || !Array.isArray(properties) || properties.length < 2) {
      return NextResponse.json({ error: "At least two properties are required for comparison" }, { status: 400 })
    }

    // Extract relevant property data for comparison
    const propertyData = properties.map((property) => ({
      id: property.id,
      title: property.title,
      price: property.price,
      size: property.size,
      rooms: property.rooms,
      location: property.location,
      description: property.description.substring(0, 300) + "...", // Truncate for prompt size
      features: property.features,
      yearBuilt: property.year_built || property.yearBuilt,
      monthlyFee: property.monthly_fee || property.monthlyFee,
      analysis: property.analysis
        ? {
            totalScore: property.analysis.total_score || property.analysis.totalScore,
            pros: property.analysis.pros,
            cons: property.analysis.cons,
            investmentRating: property.analysis.investment_rating || property.analysis.investmentRating,
            valueForMoney: property.analysis.value_for_money || property.analysis.valueForMoney,
          }
        : null,
    }))

    // Hämta användarpreferenser om användar-ID finns
    let userPreferences = null
    let features = []
    let preferenceMatches = []

    if (userId) {
      // Hämta användarpreferenser
      const { data: preferences, error: prefError } = await supabase
        .from("user_property_requirements")
        .select("feature_id, value, importance")
        .eq("user_id", userId)

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

          // Beräkna matchning för varje fastighet
          preferenceMatches = propertyData.map((property, index) => {
            // Skapa en mappning av fastighetens egenskaper
            const propertyFeatures: Record<string, any> = {
              rooms: Number.parseInt(property.rooms) || 0,
              size: Number.parseInt(property.size) || 0,
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
              const hasFeature = property.features.some(
                (feature) => feature.toLowerCase().includes(swedish) || feature.toLowerCase().includes(english),
              )
              propertyFeatures[english] = hasFeature
            })

            // Beräkna matchningspoäng
            const matchResult = calculatePropertyMatchScore(propertyFeatures, userPreferences, features)

            return {
              propertyIndex: index,
              score: matchResult.score,
              percentage: matchResult.percentage,
              matches: matchResult.matches,
            }
          })
        }
      }
    }

    // Generate comparison using AI
    const comparison = await generatePropertyComparison(propertyData, preferenceMatches)

    return NextResponse.json(comparison)
  } catch (error) {
    console.error("Error comparing properties:", error)
    return NextResponse.json({ error: "Failed to compare properties" }, { status: 500 })
  }
}

async function generatePropertyComparison(properties: any[], preferenceMatches: any[] = []) {
  let prompt = `
Jämför följande ${properties.length} fastigheter och ge en detaljerad analys på svenska:

${properties
  .map(
    (property, index) => `
FASTIGHET ${index + 1}: ${property.title}
Pris: ${property.price}
Storlek: ${property.size}
Rum: ${property.rooms}
Plats: ${property.location}
Byggår: ${property.yearBuilt || "Okänt"}
Månadsavgift: ${property.monthlyFee || "Ej tillämpligt"}
Egenskaper: ${property.features.join(", ")}
Beskrivning: ${property.description}
${
  property.analysis
    ? `
Analys:
- Totalbetyg: ${property.analysis.totalScore}/10
- Investeringsbetyg: ${property.analysis.investmentRating}/10
- Prisvärdhet: ${property.analysis.valueForMoney}/10
- Fördelar: ${property.analysis.pros.join(", ")}
- Nackdelar: ${property.analysis.cons.join(", ")}
`
    : "Ingen analys tillgänglig"
}
`,
  )
  .join("\n")}`

  // Lägg till information om matchning med användarpreferenser om tillgängligt
  if (preferenceMatches.length > 0) {
    prompt += `
MATCHNING MED ANVÄNDARPREFERENSER:
${preferenceMatches
  .map(
    (match, index) => `
Fastighet ${index + 1} (${properties[index].title}):
- Matchningspoäng: ${match.percentage}%
- Viktiga matchningar: ${
      Object.entries(match.matches)
        .filter(([_, details]: [string, any]) => details.importance >= 3 && details.matched)
        .map(([_, details]: [string, any]) => details.featureLabel)
        .join(", ") || "Inga"
    }
- Viktiga icke-matchningar: ${
      Object.entries(match.matches)
        .filter(([_, details]: [string, any]) => details.importance >= 3 && !details.matched)
        .map(([_, details]: [string, any]) => details.featureLabel)
        .join(", ") || "Inga"
    }
`,
  )
  .join("")}

Ta hänsyn till användarens preferenser i din jämförelse och rekommendation.
Prioritera fastigheter som bättre matchar användarens viktiga preferenser.
`
  }

  prompt += `
Ge följande information i JSON-format:
1. En sammanfattande jämförelse av alla fastigheter (2-3 meningar)
2. En tabell med nyckeltal för enkel jämförelse
3. En "vinnare" för varje kategori (pris, storlek, läge, etc.)
4. En detaljerad jämförelse som belyser styrkor och svagheter hos varje fastighet i förhållande till de andra
5. En övergripande rekommendation om vilken fastighet som erbjuder bäst värde
${preferenceMatches.length > 0 ? "6. En analys av hur väl varje fastighet matchar användarens preferenser" : ""}

Svara ENDAST med giltig JSON i detta format (använd svenska för all text):
{
  "summary": "Övergripande jämförelsesammanfattning",
  "comparisonTable": [
    {
      "category": "Pris",
      "values": [
        {"propertyIndex": 0, "value": "Fastighet 1 värde", "normalized": 7.5},
        {"propertyIndex": 1, "value": "Fastighet 2 värde", "normalized": 8.2},
        ...
      ],
      "winner": 1,
      "notes": "Förklaring av jämförelsen"
    },
    ...
  ],
  "categoryWinners": [
    {"category": "Pris", "winner": 1, "explanation": "Fastighet 2 har bäst pris eftersom..."},
    ...
  ],
  "detailedComparison": {
    "property0": {
      "strengths": ["Styrka 1", "Styrka 2"],
      "weaknesses": ["Svaghet 1", "Svaghet 2"],
      "comparedTo": [
        {"propertyIndex": 1, "advantages": ["Bättre än fastighet 2 i X"], "disadvantages": ["Sämre än fastighet 2 i Y"]}
      ]
    },
    ...
  },
  "recommendation": {
    "bestOverallValue": 1,
    "explanation": "Fastighet 2 erbjuder bäst totala värde eftersom...",
    "bestFor": [
      {"scenario": "Familjer", "propertyIndex": 0, "explanation": "Fastighet 1 är bäst för familjer eftersom..."},
      {"scenario": "Investering", "propertyIndex": 1, "explanation": "Fastighet 2 är bäst för investering eftersom..."}
    ]
  }${
    preferenceMatches.length > 0
      ? `,
  "preferenceAnalysis": {
    "bestMatch": 1,
    "matchExplanation": "Fastighet 2 matchar bäst användarens preferenser eftersom...",
    "propertyMatches": [
      {
        "propertyIndex": 0,
        "matchPercentage": 75,
        "matchStrengths": ["Matchar preferens 1", "Matchar preferens 2"],
        "matchWeaknesses": ["Matchar inte preferens 3"]
      },
      ...
    ]
  }`
      : ""
  }
}
`

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 3000,
    })

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from AI response")
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("Error generating property comparison:", error)
    throw error
  }
}
