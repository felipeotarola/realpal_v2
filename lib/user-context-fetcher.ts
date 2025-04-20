import { supabase } from "@/lib/supabase"

export interface SavedPropertyContext {
  id: string
  title: string
  price: string
  location: string
  size: string
  rooms: string
  description?: string
  features?: string[]
  monthly_fee?: string
  year_built?: string
  energy_rating?: string
}

export interface ComparisonContext {
  id: string
  title: string
  property_ids: string[]
  propertyTitles: string[]
  description?: string
}

export interface UserPreference {
  featureId: string
  featureLabel: string
  value: any
  importance: number
}

export interface PropertyAnalysis {
  property_id: string
  analysis_summary: string
  total_score: number
  pros: string[]
  cons: string[]
  investment_rating: number
  value_for_money: number
}

export async function fetchUserContext(userId: string) {
  try {
    // Hämta sparade fastigheter med mer detaljerad information
    console.log("Fetching saved properties for user:", userId)
    const { data: savedProperties, error: savedError } = await supabase
      .from("saved_properties")
      .select("id, title, price, location, size, rooms, description, features, monthly_fee, year_built, energy_rating")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10) // Begränsa till de 10 senaste för att hålla prompten rimlig

      console.log("Fetched saved properties:", savedProperties)
    if (savedError) throw savedError

    // Hämta sparade jämförelser med beskrivningar
    const { data: comparisons, error: compError } = await supabase
      .from("property_comparisons")
      .select("id, title, property_ids, description")
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })
      .limit(5) // Begränsa till de 5 senaste jämförelserna

      console.log("Fetched comparisons:", comparisons)
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

        // Extract the actual value from the JSONB structure
        let extractedValue = pref.value
        if (pref.value && typeof pref.value === "object") {
          // If it's an object with a value property, extract it
          if ("value" in pref.value) {
            extractedValue = pref.value.value
          }
        }

        return {
          featureId: pref.feature_id,
          featureLabel: feature?.label || pref.feature_id,
          value: extractedValue,
          importance: pref.importance,
        }
      }) || []

    // Filtrera bort preferenser med importance = 0 (inte viktiga)
    const significantPreferences = preferences.filter((pref) => pref.importance > 0)

    // Hämta fastighetsanalyser för sparade fastigheter
    const propertyIds = savedProperties?.map((p) => p.id) || []
    let propertyAnalyses: PropertyAnalysis[] = []

    if (propertyIds.length > 0) {
      const { data: analyses, error: analysesError } = await supabase
        .from("property_analyses")
        .select("property_id, analysis_summary, total_score, pros, cons, investment_rating, value_for_money")
        .in("property_id", propertyIds)

      if (!analysesError && analyses) {
        propertyAnalyses = analyses
      }
    }

    return {
      savedProperties: savedProperties || [],
      comparisons: enhancedComparisons,
      preferences: significantPreferences,
      propertyAnalyses: propertyAnalyses,
    }
  } catch (error) {
    console.error("Error fetching user context:", error)
    return {
      savedProperties: [],
      comparisons: [],
      preferences: [],
      propertyAnalyses: [],
    }
  }
}

// Formatera användarkontext till en sträng för AI-prompten
export function formatUserContextForPrompt(
  savedProperties: SavedPropertyContext[],
  comparisons: ComparisonContext[],
  preferences: UserPreference[],
  propertyAnalyses: PropertyAnalysis[] = [],
): string {
  let contextString = ""

  if (savedProperties.length > 0) {
    contextString += "ANVÄNDARENS SPARADE FASTIGHETER:\n"
    savedProperties.forEach((property, index) => {
      contextString += `${index + 1}. ID: ${property.id} - ${property.title} - ${property.price} - ${property.location} - ${property.size} - ${property.rooms} rum\n`
      if (property.monthly_fee) contextString += `   Månadsavgift: ${property.monthly_fee}\n`
      if (property.year_built) contextString += `   Byggår: ${property.year_built}\n`
      if (property.energy_rating) contextString += `   Energiklass: ${property.energy_rating}\n`
      if (property.features && property.features.length > 0) {
        contextString += `   Egenskaper: ${property.features.join(", ")}\n`
      }

      // Add analysis information if available
      const analysis = propertyAnalyses.find((a) => a.property_id === property.id)
      if (analysis) {
        contextString += `   Analys: Totalpoäng ${analysis.total_score}/10, Investeringsbetyg: ${analysis.investment_rating}/10, Prisvärdhet: ${analysis.value_for_money}/10\n`
        if (analysis.pros && analysis.pros.length > 0) {
          contextString += `   Fördelar: ${analysis.pros.join(", ")}\n`
        }
        if (analysis.cons && analysis.cons.length > 0) {
          contextString += `   Nackdelar: ${analysis.cons.join(", ")}\n`
        }
      }
    })
    contextString += "\n"
  }

  if (comparisons.length > 0) {
    contextString += "ANVÄNDARENS SPARADE JÄMFÖRELSER:\n"
    comparisons.forEach((comparison, index) => {
      contextString += `${index + 1}. ID: ${comparison.id} - ${comparison.title}`
      if (comparison.description) contextString += ` - ${comparison.description}`
      contextString += `\n   Jämför: ${comparison.propertyTitles.join(" vs ")}\n`
      contextString += `   Fastighets-IDs: ${comparison.property_ids.join(", ")}\n`
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

// Funktion för att hämta detaljerad information om en specifik fastighet
export async function fetchPropertyDetails(propertyId: string) {
  try {
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("id", propertyId)
      .single()

    if (propertyError) throw propertyError

    const { data: analysis, error: analysisError } = await supabase
      .from("property_analyses")
      .select("*")
      .eq("property_id", propertyId)
      .single()

    return {
      property,
      analysis: analysisError ? null : analysis,
    }
  } catch (error) {
    console.error("Error fetching property details:", error)
    return { property: null, analysis: null }
  }
}

// Funktion för att hämta detaljerad information om en specifik jämförelse
export async function fetchComparisonDetails(comparisonId: string) {
  try {
    const { data: comparison, error: comparisonError } = await supabase
      .from("property_comparisons")
      .select("*")
      .eq("id", comparisonId)
      .single()

    if (comparisonError) throw comparisonError

    let properties = []
    if (comparison && comparison.property_ids && comparison.property_ids.length > 0) {
      const { data: propertyData, error: propertiesError } = await supabase
        .from("saved_properties")
        .select("*")
        .in("id", comparison.property_ids)

      if (!propertiesError) {
        properties = propertyData
      }
    }

    return {
      comparison,
      properties,
    }
  } catch (error) {
    console.error("Error fetching comparison details:", error)
    return { comparison: null, properties: [] }
  }
}

// Add this function at the end of the file
export async function getPropertyDetails(propertyId: string) {
  try {
    // Get the basic property information
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("id", propertyId)
      .single()

    if (propertyError) throw propertyError

    // Get the property analysis if available
    const { data: analysis, error: analysisError } = await supabase
      .from("property_analyses")
      .select("*")
      .eq("property_id", propertyId)
      .single()

    // Get property images if available
    const { data: images, error: imagesError } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("position", { ascending: true })

    return {
      property,
      analysis: analysisError ? null : analysis,
      images: imagesError ? [] : images || [],
    }
  } catch (error) {
    console.error("Error fetching property details:", error)
    return { property: null, analysis: null, images: [] }
  }
}
