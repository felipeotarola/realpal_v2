import { supabase } from "@/lib/supabase"

export interface SavedPropertyContext {
  id: string
  title: string
  price: string
  location: string
  size: string
  rooms: string
}

export interface ComparisonContext {
  id: string
  title: string
  property_ids: string[]
  propertyTitles: string[]
}

export async function fetchUserContext(userId: string) {
  try {
    // Hämta sparade fastigheter
    const { data: savedProperties, error: savedError } = await supabase
      .from("saved_properties")
      .select("id, title, price, location, size, rooms")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10) // Begränsa till de 10 senaste för att hålla prompten rimlig

    if (savedError) throw savedError

    // Hämta sparade jämförelser
    const { data: comparisons, error: compError } = await supabase
      .from("property_comparisons")
      .select("id, title, property_ids")
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })
      .limit(5) // Begränsa till de 5 senaste jämförelserna

    if (compError) throw compError

    // Hämta fastighetstitlar för jämförelser
    const enhancedComparisons: ComparisonContext[] = []

    for (const comparison of comparisons) {
      if (comparison.property_ids && comparison.property_ids.length > 0) {
        const { data: propertyTitles, error: titlesError } = await supabase
          .from("saved_properties")
          .select("title")
          .in("id", comparison.property_ids)

        if (!titlesError && propertyTitles) {
          enhancedComparisons.push({
            ...comparison,
            propertyTitles: propertyTitles.map((p) => p.title),
          })
        } else {
          enhancedComparisons.push({
            ...comparison,
            propertyTitles: [],
          })
        }
      } else {
        enhancedComparisons.push({
          ...comparison,
          propertyTitles: [],
        })
      }
    }

    return {
      savedProperties: savedProperties || [],
      comparisons: enhancedComparisons,
    }
  } catch (error) {
    console.error("Error fetching user context:", error)
    return {
      savedProperties: [],
      comparisons: [],
    }
  }
}

// Formatera användarkontext till en sträng för AI-prompten
export function formatUserContextForPrompt(
  savedProperties: SavedPropertyContext[],
  comparisons: ComparisonContext[],
): string {
  let contextString = ""

  if (savedProperties.length > 0) {
    contextString += "ANVÄNDARENS SPARADE FASTIGHETER:\n"
    savedProperties.forEach((property, index) => {
      contextString += `${index + 1}. ${property.title} - ${property.price} - ${property.location} - ${property.size} - ${property.rooms} rum\n`
    })
    contextString += "\n"
  }

  if (comparisons.length > 0) {
    contextString += "ANVÄNDARENS SPARADE JÄMFÖRELSER:\n"
    comparisons.forEach((comparison, index) => {
      contextString += `${index + 1}. ${comparison.title} - Jämför: ${comparison.propertyTitles.join(", ")}\n`
    })
  }

  return contextString
}
