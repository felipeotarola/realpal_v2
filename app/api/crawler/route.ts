import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { NextResponse } from "next/server"

// Sätt dynamisk rendering för att undvika caching
export const dynamic = "force-dynamic"
// Öka timeout till 300 sekunder
export const maxDuration = 300 // 5 minuter i sekunder

export interface PropertyData {
  title: string
  price: string
  size: string
  rooms: string
  location: string
  description: string
  features: string[]
  images: string[]
  url: string
  agent?: string
  yearBuilt?: string
  monthlyFee?: string
  energyRating?: string
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL krävs" }, { status: 400 })
    }

    // Först försöker vi använda Firecrawl API för strukturerad datahämtning
    const propertyData = await extractPropertyDataWithFirecrawl(url)

    // Om Firecrawl-hämtningen misslyckas, fallback till vår anpassade hämtning
    if (!propertyData.success) {
      const fallbackData = await fallbackExtraction(url)
      return NextResponse.json(fallbackData)
    }

    return NextResponse.json({
      property: propertyData.data,
      images: propertyData.images || [],
      metadata: {
        crawledAt: new Date().toISOString(),
        extractionMethod: "firecrawl",
      },
    })
  } catch (error) {
    console.error("Error crawling website:", error)
    return NextResponse.json({ error: "Kunde inte hämta fastighetsdetaljer" }, { status: 500 })
  }
}

async function extractPropertyDataWithFirecrawl(url: string) {
  try {
    // Definiera schemat för fastighetsdatahämtning
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", description: "The property title or address" },
        price: { type: "string", description: "The asking price of the property" },
        size: { type: "string", description: "The size in square meters" },
        rooms: { type: "string", description: "Number of rooms" },
        location: { type: "string", description: "The location/address" },
        description: { type: "string", description: "A brief description of the property" },
        features: {
          type: "array",
          items: { type: "string" },
          description: "Key features and amenities of the property",
        },
        yearBuilt: { type: "string", description: "When the property was built (if available)" },
        monthlyFee: { type: "string", description: "Monthly fee or maintenance cost (if available)" },
        energyRating: { type: "string", description: "Energy rating (if available)" },
        agent: { type: "string", description: "Real estate agent or company (if available)" },
      },
      required: ["title", "price", "size", "rooms", "location", "description", "features"],
    }

    // Gör förfrågan till Firecrawl API
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ["json", "screenshot"],
        jsonOptions: {
          schema: schema,
          systemPrompt:
            "You are an expert in real estate data extraction. Extract accurate property details from this page.",
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error("Firecrawl extraction failed")
    }

    // Extrahera bilder från sidan
    let images: string[] = []

    // Om skärmdump är tillgänglig, lägg till den som första bild
    if (result.data.screenshot) {
      images.push(result.data.screenshot)
    }

    // Försök att extrahera bild-URL:er från fastighetsdata
    if (result.data.json && Array.isArray(result.data.json.images)) {
      images = [...images, ...result.data.json.images]
    }

    // Rensa upp data för att matcha vårt PropertyData-gränssnitt
    const propertyData: PropertyData = {
      title: result.data.json.title || "Okänd fastighet",
      price: result.data.json.price || "Pris ej angivet",
      size: result.data.json.size || "Storlek ej angiven",
      rooms: result.data.json.rooms || "Rum ej angivet",
      location: result.data.json.location || "Plats ej angiven",
      description: result.data.json.description || "Ingen beskrivning tillgänglig",
      features: Array.isArray(result.data.json.features) ? result.data.json.features : [],
      images: images,
      url: url,
      agent: result.data.json.agent,
      yearBuilt: result.data.json.yearBuilt,
      monthlyFee: result.data.json.monthlyFee,
      energyRating: result.data.json.energyRating,
    }

    return {
      success: true,
      data: propertyData,
      images: images,
    }
  } catch (error) {
    console.error("Error with Firecrawl extraction:", error)
    return { success: false, data: null, images: [] }
  }
}

// Vår fallback-hämtningsmetod med anpassad fetch och AI
async function fallbackExtraction(url: string) {
  try {
    // Förbättrade headers för att efterlikna en riktig webbläsare
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://www.google.com/",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    }

    // Försök att hämta URL:en med förbättrade headers
    const response = await fetch(url, { headers })

    if (!response.ok) {
      if (response.status === 403) {
        return await analyzePropertyUrlWithAI(url)
      }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    // Extrahera bilder från HTML
    const images = extractImages(html, url)

    // Extrahera fastighetsdata med AI
    const propertyData = await extractPropertyData(html, url, images)

    return {
      property: propertyData,
      images: images,
      metadata: {
        crawledAt: new Date().toISOString(),
        extractionMethod: "fallback-ai",
      },
    }
  } catch (error) {
    console.error("Error in fallback extraction:", error)
    throw error
  }
}

// Extrahera bilder från HTML
function extractImages(html: string, baseUrl: string) {
  try {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const srcsetRegex = /<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi
    const images = new Set<string>()
    const baseUrlObj = new URL(baseUrl)

    // Extrahera vanliga src-attribut
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      let imgSrc = match[1].trim()

      // Hoppa över data-URL:er, SVG:er och små bilder
      if (imgSrc.startsWith("data:") || imgSrc.includes(".svg")) {
        continue
      }

      // Konvertera relativa URL:er till absoluta
      if (imgSrc.startsWith("/")) {
        imgSrc = baseUrlObj.origin + imgSrc
      } else if (!imgSrc.startsWith("http")) {
        imgSrc = new URL(imgSrc, baseUrl).href
      }

      images.add(imgSrc)
    }

    // Extrahera srcset-attribut
    while ((match = srcsetRegex.exec(html)) !== null) {
      const srcset = match[1].trim()
      const srcsetParts = srcset.split(",")

      for (const part of srcsetParts) {
        const [url] = part.trim().split(" ")
        if (url && !url.startsWith("data:") && !url.includes(".svg")) {
          let imgSrc = url.trim()

          // Konvertera relativa URL:er till absoluta
          if (imgSrc.startsWith("/")) {
            imgSrc = baseUrlObj.origin + imgSrc
          } else if (!imgSrc.startsWith("http")) {
            imgSrc = new URL(imgSrc, baseUrl).href
          }

          images.add(imgSrc)
        }
      }
    }

    // Konvertera Set till Array och begränsa till 20 bilder för att undvika att överbelasta UI
    return Array.from(images).slice(0, 20)
  } catch (error) {
    console.error("Error extracting images:", error)
    return []
  }
}

// Extrahera JSON från AI-svar, hantera markdown-kodblock
function extractJsonFromAIResponse(text: string): any {
  try {
    // Först försök att tolka texten direkt som JSON
    try {
      return JSON.parse(text.trim())
    } catch (e) {
      // Om det misslyckas, försök att extrahera JSON från markdown-kodblock
      console.log("Direct JSON parsing failed, trying to extract from markdown")
    }

    // Leta efter JSON i markdown-kodblock
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/
    const match = text.match(jsonBlockRegex)

    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim())
      } catch (e) {
        console.error("Failed to parse extracted JSON block:", e)
      }
    }

    // Om det misslyckas, försök att hitta något som ser ut som ett JSON-objekt
    const jsonObjectRegex = /\{[\s\S]*\}/
    const objectMatch = text.match(jsonObjectRegex)

    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch (e) {
        console.error("Failed to parse JSON object:", e)
      }
    }

    // Om alla tolkningsförsök misslyckas, returnera ett tomt objekt
    console.error("All JSON parsing attempts failed, returning empty object")
    return {}
  } catch (error) {
    console.error("Error in extractJsonFromAIResponse:", error)
    return {}
  }
}

async function extractPropertyData(html: string, url: string, images: string[]): Promise<PropertyData> {
  try {
    const prompt =
      "Extract structured property listing data from this HTML. " +
      "Return ONLY a valid JSON object with these fields:\n" +
      "- title: The property title or address\n" +
      "- price: The asking price (IMPORTANT: Look for the current price, not any old price)\n" +
      "- size: The size in square meters\n" +
      "- rooms: Number of rooms\n" +
      "- location: The location/address\n" +
      "- description: A brief description of the property\n" +
      "- features: An array of key features/amenities\n" +
      "- yearBuilt: When the property was built (if available)\n" +
      "- monthlyFee: Monthly fee or maintenance cost (if available)\n" +
      "- energyRating: Energy rating (if available)\n" +
      "- agent: Real estate agent or company (if available)\n\n" +
      "IMPORTANT: For the price, look for elements with class names containing 'price', 'pris', or data attributes related to price.\n" +
      "For the year built, look for elements with text containing 'Byggår', 'byggt', 'built in', or similar.\n\n" +
      "If you can't find a specific field, use null or an empty string/array as appropriate.\n\n" +
      "HTML: " +
      html.substring(0, 50000)

    const { text: jsonData } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 2000,
    })

    // Tolka JSON-svaret med vår förbättrade extraktionsfunktion
    const parsedData = extractJsonFromAIResponse(jsonData)

    // Säkerställ att alla obligatoriska fält finns
    return {
      title: parsedData.title || "Okänd fastighet",
      price: parsedData.price || "Pris ej angivet",
      size: parsedData.size || "Storlek ej angiven",
      rooms: parsedData.rooms || "Rum ej angivet",
      location: parsedData.location || "Plats ej angiven",
      description: parsedData.description || "Ingen beskrivning tillgänglig",
      features: parsedData.features || [],
      images: images,
      url: url,
      agent: parsedData.agent,
      yearBuilt: parsedData.yearBuilt,
      monthlyFee: parsedData.monthlyFee,
      energyRating: parsedData.energyRating,
    }
  } catch (error) {
    console.error("Error extracting property data:", error)
    return {
      title: "Kunde inte extrahera fastighetsdetaljer",
      price: "Okänd",
      size: "Okänd",
      rooms: "Okänd",
      location: "Okänd",
      description: "Kunde inte extrahera fastighetsinformation från denna sida.",
      features: [],
      images: images,
      url: url,
    }
  }
}

async function analyzePropertyUrlWithAI(url: string): Promise<any> {
  try {
    const prompt =
      "This URL appears to be a property listing: " +
      url +
      "\n\n" +
      "Based on the URL structure and any information you can infer, generate a plausible property listing.\n" +
      "Return ONLY a valid JSON object with these fields:\n" +
      "- title: The property title or address\n" +
      "- price: The asking price\n" +
      "- size: The size in square meters\n" +
      "- rooms: Number of rooms\n" +
      "- location: The location/address\n" +
      "- description: A brief description of the property\n" +
      "- features: An array of key features/amenities\n" +
      "- yearBuilt: When the property was built (if available)\n" +
      "- monthlyFee: Monthly fee or maintenance cost (if available)\n" +
      "- energyRating: Energy rating (if available)\n" +
      "- agent: Real estate agent or company (if available)\n\n" +
      "If you can't determine a specific field, use null or an empty string/array as appropriate.\n\n" +
      "IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations."

    const { text: jsonData } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 1000,
    })

    // Tolka JSON-svaret med vår förbättrade extraktionsfunktion
    const parsedData = extractJsonFromAIResponse(jsonData)

    return {
      property: {
        title: parsedData.title || "Okänd fastighet",
        price: parsedData.price || "Pris ej angivet",
        size: parsedData.size || "Storlek ej angiven",
        rooms: parsedData.rooms || "Rum ej angivet",
        location: parsedData.location || "Plats ej angiven",
        description: parsedData.description || "Ingen beskrivning tillgänglig",
        features: parsedData.features || [],
        images: [],
        url: url,
        agent: parsedData.agent,
        yearBuilt: parsedData.yearBuilt,
        monthlyFee: parsedData.monthlyFee,
        energyRating: parsedData.energyRating,
      },
      images: [],
      metadata: {
        crawledAt: new Date().toISOString(),
        note: "Denna webbplats blockerade vår crawler. Fastighetsdetaljer är uppskattade baserat på URL:en.",
        extractionMethod: "url-analysis",
      },
    }
  } catch (error) {
    console.error("Error analyzing property URL:", error)
    throw error
  }
}
