"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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

export async function crawlWebsite(url: string) {
  try {
    // First try using Firecrawl API for structured data extraction
    const propertyData = await extractPropertyDataWithFirecrawl(url)

    // If Firecrawl extraction fails, fall back to our custom extraction
    if (!propertyData.success) {
      return await fallbackExtraction(url)
    }

    return {
      property: propertyData.data,
      images: propertyData.images || [],
      metadata: {
        crawledAt: new Date().toISOString(),
        extractionMethod: "firecrawl",
      },
    }
  } catch (error) {
    console.error("Error crawling website:", error)
    // Fall back to our custom extraction if Firecrawl fails
    return await fallbackExtraction(url)
  }
}

async function extractPropertyDataWithFirecrawl(url: string) {
  try {
    // Define the schema for property data extraction
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

    // Make request to Firecrawl API
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

    // Extract images from the page
    let images: string[] = []

    // If screenshot is available, add it as the first image
    if (result.data.screenshot) {
      images.push(result.data.screenshot)
    }

    // Try to extract image URLs from the property data
    if (result.data.json && Array.isArray(result.data.json.images)) {
      images = [...images, ...result.data.json.images]
    }

    // Clean up the data to match our PropertyData interface
    const propertyData: PropertyData = {
      title: result.data.json.title || "Unknown Property",
      price: result.data.json.price || "Price not specified",
      size: result.data.json.size || "Size not specified",
      rooms: result.data.json.rooms || "Rooms not specified",
      location: result.data.json.location || "Location not specified",
      description: result.data.json.description || "No description available",
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

// Our fallback extraction method using custom fetch and AI
async function fallbackExtraction(url: string) {
  try {
    // Enhanced headers to mimic a real browser
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

    // Try to fetch the URL with enhanced headers
    const response = await fetch(url, { headers })

    if (!response.ok) {
      if (response.status === 403) {
        return await analyzePropertyUrlWithAI(url)
      }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    // Extract images from HTML
    const images = extractImages(html, url)

    // Extract property data using AI
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

// Extract images from HTML
function extractImages(html: string, baseUrl: string) {
  try {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const srcsetRegex = /<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi
    const images = new Set<string>()
    const baseUrlObj = new URL(baseUrl)

    // Extract regular src attributes
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      let imgSrc = match[1].trim()

      // Skip data URLs, SVGs, and tiny images
      if (imgSrc.startsWith("data:") || imgSrc.includes(".svg")) {
        continue
      }

      // Convert relative URLs to absolute
      if (imgSrc.startsWith("/")) {
        imgSrc = baseUrlObj.origin + imgSrc
      } else if (!imgSrc.startsWith("http")) {
        imgSrc = new URL(imgSrc, baseUrl).href
      }

      images.add(imgSrc)
    }

    // Extract srcset attributes
    while ((match = srcsetRegex.exec(html)) !== null) {
      const srcset = match[1].trim()
      const srcsetParts = srcset.split(",")

      for (const part of srcsetParts) {
        const [url] = part.trim().split(" ")
        if (url && !url.startsWith("data:") && !url.includes(".svg")) {
          let imgSrc = url.trim()

          // Convert relative URLs to absolute
          if (imgSrc.startsWith("/")) {
            imgSrc = baseUrlObj.origin + imgSrc
          } else if (!imgSrc.startsWith("http")) {
            imgSrc = new URL(imgSrc, baseUrl).href
          }

          images.add(imgSrc)
        }
      }
    }

    // Convert Set to Array and limit to 20 images to avoid overwhelming the UI
    return Array.from(images).slice(0, 20)
  } catch (error) {
    console.error("Error extracting images:", error)
    return []
  }
}

// Extract JSON from AI response, handling markdown code blocks
function extractJsonFromAIResponse(text: string): any {
  try {
    // First try to parse the text directly as JSON
    try {
      return JSON.parse(text.trim())
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      console.log("Direct JSON parsing failed, trying to extract from markdown")
    }

    // Look for JSON in markdown code blocks
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/
    const match = text.match(jsonBlockRegex)

    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim())
      } catch (e) {
        console.error("Failed to parse extracted JSON block:", e)
      }
    }

    // If that fails, try to find anything that looks like a JSON object
    const jsonObjectRegex = /\{[\s\S]*\}/
    const objectMatch = text.match(jsonObjectRegex)

    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch (e) {
        console.error("Failed to parse JSON object:", e)
      }
    }

    // If all parsing attempts fail, return an empty object
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

    // Parse the JSON response using our enhanced extraction function
    const parsedData = extractJsonFromAIResponse(jsonData)

    // Ensure all required fields exist
    return {
      title: parsedData.title || "Unknown Property",
      price: parsedData.price || "Price not specified",
      size: parsedData.size || "Size not specified",
      rooms: parsedData.rooms || "Rooms not specified",
      location: parsedData.location || "Location not specified",
      description: parsedData.description || "No description available",
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
      title: "Failed to extract property details",
      price: "Unknown",
      size: "Unknown",
      rooms: "Unknown",
      location: "Unknown",
      description: "Could not extract property information from this page.",
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

    // Parse the JSON response using our enhanced extraction function
    const parsedData = extractJsonFromAIResponse(jsonData)

    return {
      property: {
        title: parsedData.title || "Unknown Property",
        price: parsedData.price || "Price not specified",
        size: parsedData.size || "Size not specified",
        rooms: parsedData.rooms || "Rooms not specified",
        location: parsedData.location || "Location not specified",
        description: parsedData.description || "No description available",
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
        note: "This website blocked our crawler. Property details are estimated based on the URL.",
        extractionMethod: "url-analysis",
      },
    }
  } catch (error) {
    console.error("Error analyzing property URL:", error)
    throw error
  }
}
