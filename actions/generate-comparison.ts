"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface PropertyData {
  id: string
  title: string
  price: string
  size: string
  rooms: string
  location: string
  description: string
  features: string[]
  yearBuilt?: string
  monthlyFee?: string
  analysis?: {
    totalScore: number
    pros: string[]
    cons: string[]
    investmentRating: number
    valueForMoney: number
  } | null
}

export async function generateAIComparison(properties: PropertyData[]) {
  if (properties.length < 2) {
    throw new Error("At least 2 properties are required for comparison")
  }

  try {
    // Create the prompt for OpenAI
    const prompt = `
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
  .join("\n")}

Ge följande information i JSON-format:
1. En sammanfattande jämförelse av alla fastigheter (2-3 meningar)
2. En tabell med nyckeltal för enkel jämförelse
3. En "vinnare" för varje kategori (pris, storlek, läge, etc.)
4. En detaljerad jämförelse som belyser styrkor och svagheter hos varje fastighet i förhållande till de andra
5. En övergripande rekommendation om vilken fastighet som erbjuder bäst värde

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
  }
}`

    // Generate the comparison using OpenAI
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
    console.error("Error generating AI comparison:", error)
    throw new Error("Failed to generate comparison. Please try again later.")
  }
}
