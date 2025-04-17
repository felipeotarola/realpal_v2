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
Compare the following ${properties.length} properties and provide a detailed analysis:

${properties
  .map(
    (property, index) => `
PROPERTY ${index + 1}: ${property.title}
Price: ${property.price}
Size: ${property.size}
Rooms: ${property.rooms}
Location: ${property.location}
Year Built: ${property.yearBuilt || "Unknown"}
Monthly Fee: ${property.monthlyFee || "N/A"}
Features: ${property.features.join(", ")}
Description: ${property.description}
${
  property.analysis
    ? `
Analysis:
- Total Score: ${property.analysis.totalScore}/10
- Investment Rating: ${property.analysis.investmentRating}/10
- Value For Money: ${property.analysis.valueForMoney}/10
- Pros: ${property.analysis.pros.join(", ")}
- Cons: ${property.analysis.cons.join(", ")}
`
    : "No analysis available"
}
`,
  )
  .join("\n")}

Please provide the following in JSON format:
1. A summary comparison of all properties (2-3 sentences)
2. A table of key metrics for easy comparison
3. A "winner" for each category (price, size, location, etc.)
4. A detailed comparison highlighting the strengths and weaknesses of each property relative to the others
5. An overall recommendation on which property offers the best value

Return ONLY valid JSON in this format:
{
  "summary": "Overall comparison summary",
  "comparisonTable": [
    {
      "category": "Price",
      "values": [
        {"propertyIndex": 0, "value": "Property 1 value", "normalized": 7.5},
        {"propertyIndex": 1, "value": "Property 2 value", "normalized": 8.2},
        ...
      ],
      "winner": 1,
      "notes": "Explanation of the comparison"
    },
    ...
  ],
  "categoryWinners": [
    {"category": "Price", "winner": 1, "explanation": "Property 2 has the best price because..."},
    ...
  ],
  "detailedComparison": {
    "property0": {
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "comparedTo": [
        {"propertyIndex": 1, "advantages": ["Better than property 2 in X"], "disadvantages": ["Worse than property 2 in Y"]}
      ]
    },
    ...
  },
  "recommendation": {
    "bestOverallValue": 1,
    "explanation": "Property 2 offers the best overall value because...",
    "bestFor": [
      {"scenario": "Families", "propertyIndex": 0, "explanation": "Property 1 is best for families because..."},
      {"scenario": "Investment", "propertyIndex": 1, "explanation": "Property 2 is best for investment because..."}
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
