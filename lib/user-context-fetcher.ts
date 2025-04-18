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

export interface UserPreference {
  featureId: string
  featureLabel: string
  value: any
  importance: number
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

    // Hämta användarens preferenser
    const { data: userPreferences, error: prefError } = await supabase
      .from("user_property_requirements")
      .select("feature_id, value, importance")
      .eq("user_id", userId)

    if (prefError) throw prefError

    // Hämta egenskapsinformation för att få etiketter
    const { data: features, error: featError } = await supabase.from("property_features").select("id, label")

    if (featError) throw featError

    // Kombinera preferenser med egenskapsetiketter
    const preferences: UserPreference[] =
      userPreferences?.map((pref) => {
        const feature = features?.find((f) => f.id === pref.feature_id)
        return {
          featureId: pref.feature_id,
          featureLabel: feature?.label || pref.feature_id,
          value: pref.value.value !== undefined ? pref.value.value : pref.value,
          importance: pref.importance,
        }
      }) || []

    // Filtrera bort preferenser med importance = 0 (inte viktiga)
    const significantPreferences = preferences.filter((pref) => pref.importance > 0)

    return {
      savedProperties: savedProperties || [],
      comparisons: enhancedComparisons,
      preferences: significantPreferences,
    }
  } catch (error) {
    console.error("Error fetching user context:", error)
    return {
      savedProperties: [],
      comparisons: [],
      preferences: [],
    }
  }
}

// Formatera användarkontext till en sträng för AI-prompten
export function formatUserContextForPrompt(
  savedProperties: SavedPropertyContext[],
  comparisons: ComparisonContext[],
  preferences: UserPreference[],
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
    contextString += "\n"
  }

  if (preferences.length > 0) {
    contextString += "ANVÄNDARENS PREFERENSER:\n"

    // Gruppera preferenser efter viktighet
    const mustHave = preferences.filter((p) => p.importance === 4)
    const veryImportant = preferences.filter((p) => p.importance === 3)
    const somewhatImportant = preferences.filter((p) => p.importance === 2)
    const niceToHave = preferences.filter((p) => p.importance === 1)

    if (mustHave.length > 0) {
      contextString += "Måste ha:\n"
      mustHave.forEach((pref) => {
        contextString += `- ${pref.featureLabel}: ${formatPreferenceValue(pref.value)}\n`
      })
    }

    if (veryImportant.length > 0) {
      contextString += "Mycket viktigt:\n"
      veryImportant.forEach((pref) => {
        contextString += `- ${pref.featureLabel}: ${formatPreferenceValue(pref.value)}\n`
      })
    }

    if (somewhatImportant.length > 0) {
      contextString += "Ganska viktigt:\n"
      somewhatImportant.forEach((pref) => {
        contextString += `- ${pref.featureLabel}: ${formatPreferenceValue(pref.value)}\n`
      })
    }

    if (niceToHave.length > 0) {
      contextString += "Trevligt att ha:\n"
      niceToHave.forEach((pref) => {
        contextString += `- ${pref.featureLabel}: ${formatPreferenceValue(pref.value)}\n`
      })
    }
  }

  return contextString
}

// Hjälpfunktion för att formatera preferensvärden
function formatPreferenceValue(value: any): string {
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nej"
  }
  if (typeof value === "number") {
    return value.toString()
  }
  return String(value)
}
