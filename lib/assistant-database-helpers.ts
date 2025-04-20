import { supabase } from "@/lib/supabase"

// Function to list all saved properties for a user
export async function listSavedProperties(userId: string) {
  try {
    const { data, error } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error listing saved properties:", error)
    return []
  }
}

// Function to get property details by ID
export async function getPropertyById(propertyId: string) {
  try {
    const { data, error } = await supabase.from("saved_properties").select("*").eq("id", propertyId).single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error getting property by ID:", error)
    return null
  }
}

// Function to get property analysis by property ID
export async function getPropertyAnalysis(propertyId: string) {
  try {
    const { data, error } = await supabase.from("property_analyses").select("*").eq("property_id", propertyId).single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error getting property analysis:", error)
    return null
  }
}

// Function to list all comparisons for a user
export async function listComparisons(userId: string) {
  try {
    const { data, error } = await supabase
      .from("property_comparisons")
      .select("*")
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error listing comparisons:", error)
    return []
  }
}

// Function to get comparison details by ID
export async function getComparisonById(comparisonId: string) {
  try {
    const { data, error } = await supabase.from("property_comparisons").select("*").eq("id", comparisonId).single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error getting comparison by ID:", error)
    return null
  }
}

// Function to get user preferences
export async function getUserPreferences(userId: string) {
  try {
    const { data: userPreferences, error: prefError } = await supabase
      .from("user_property_requirements")
      .select("feature_id, value, importance")
      .eq("user_id", userId)

    if (prefError) throw prefError

    const { data: features, error: featError } = await supabase.from("property_features").select("id, label")

    if (featError) throw featError

    const preferences =
      userPreferences?.map((pref) => {
        const feature = features?.find((f) => f.id === pref.feature_id)

        // Extract the actual value from the JSONB structure
        let extractedValue = pref.value
        if (pref.value && typeof pref.value === "object") {
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

    return preferences
  } catch (error) {
    console.error("Error getting user preferences:", error)
    return []
  }
}

// Function to compare properties
export async function compareProperties(propertyIds: string[]) {
  try {
    const { data, error } = await supabase.from("saved_properties").select("*").in("id", propertyIds)

    if (error) throw error

    // Get analyses for these properties
    const { data: analyses, error: analysesError } = await supabase
      .from("property_analyses")
      .select("*")
      .in("property_id", propertyIds)

    if (analysesError) throw analysesError

    return {
      properties: data || [],
      analyses: analyses || [],
    }
  } catch (error) {
    console.error("Error comparing properties:", error)
    return { properties: [], analyses: [] }
  }
}

// Add a function to search properties by criteria

// Add this function at the end of the file
export async function searchProperties(
  userId: string,
  criteria: {
    minPrice?: number
    maxPrice?: number
    minSize?: number
    maxSize?: number
    minRooms?: number
    maxRooms?: number
    location?: string
  },
) {
  try {
    let query = supabase.from("saved_properties").select("*").eq("user_id", userId)

    if (criteria.minPrice) query = query.gte("price_numeric", criteria.minPrice)
    if (criteria.maxPrice) query = query.lte("price_numeric", criteria.maxPrice)
    if (criteria.minSize) query = query.gte("size_numeric", criteria.minSize)
    if (criteria.maxSize) query = query.lte("size_numeric", criteria.maxSize)
    if (criteria.minRooms) query = query.gte("rooms_numeric", criteria.minRooms)
    if (criteria.maxRooms) query = query.lte("rooms_numeric", criteria.maxRooms)
    if (criteria.location) query = query.ilike("location", `%${criteria.location}%`)

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error searching properties:", error)
    return []
  }
}

// Add a function to get properties that best match user preferences
export async function getPropertiesMatchingPreferences(userId: string) {
  try {
    // Get user preferences
    const preferences = await getUserPreferences(userId)
    if (preferences.length === 0) return []

    // Get all user properties
    const properties = await listSavedProperties(userId)
    if (properties.length === 0) return []

    // Get property analyses for scoring
    const propertyIds = properties.map((p) => p.id)
    const { data: analyses } = await supabase.from("property_analyses").select("*").in("property_id", propertyIds)

    const analysesMap = new Map()
    if (analyses) {
      analyses.forEach((analysis) => {
        analysesMap.set(analysis.property_id, analysis)
      })
    }

    // Score properties based on preferences
    const scoredProperties = properties.map((property) => {
      const analysis = analysesMap.get(property.id)
      let score = 0
      let matchCount = 0
      let mustHaveCount = 0
      let mustHaveMatched = 0

      // Calculate preference match score
      preferences.forEach((pref) => {
        if (pref.importance > 0) {
          const propertyValue = getPropertyValueForFeature(property, pref.featureId)
          const matches = doesPropertyValueMatchPreference(propertyValue, pref.value)

          if (pref.importance === 4) {
            // Must have
            mustHaveCount++
            if (matches) {
              mustHaveMatched++
              score += 4
            }
          } else if (matches) {
            score += pref.importance
          }

          if (matches) matchCount++
        }
      })

      // Add analysis score if available
      if (analysis) {
        score += analysis.total_score / 2 // Weight the analysis less than direct preference matches
      }

      return {
        ...property,
        preferenceScore: score,
        matchCount,
        totalPreferences: preferences.filter((p) => p.importance > 0).length,
        mustHaveMatched,
        mustHaveCount,
        analysis,
      }
    })

    // Sort by score (highest first)
    return scoredProperties.sort((a, b) => b.preferenceScore - a.preferenceScore)
  } catch (error) {
    console.error("Error getting properties matching preferences:", error)
    return []
  }
}

// Helper function to get property value for a specific feature
function getPropertyValueForFeature(property: any, featureId: string) {
  // Map feature IDs to property fields
  switch (featureId) {
    case "price":
      return property.price_numeric
    case "size":
      return property.size_numeric
    case "rooms":
      return property.rooms_numeric
    case "location":
      return property.location
    case "monthly_fee":
      return property.monthly_fee_numeric
    case "year_built":
      return property.year_built
    default:
      // Check if the feature is in the features array
      if (property.features && Array.isArray(property.features)) {
        return property.features.includes(featureId)
      }
      return null
  }
}

// Helper function to check if a property value matches a preference
function doesPropertyValueMatchPreference(propertyValue: any, preferenceValue: any) {
  if (propertyValue === null || preferenceValue === null) return false

  // Handle different types of values
  if (typeof preferenceValue === "boolean") {
    return propertyValue === preferenceValue
  }

  if (typeof preferenceValue === "object" && preferenceValue !== null) {
    // Range preference (min/max)
    if (preferenceValue.min !== undefined && propertyValue < preferenceValue.min) return false
    if (preferenceValue.max !== undefined && propertyValue > preferenceValue.max) return false
    return true
  }

  if (typeof propertyValue === "string" && typeof preferenceValue === "string") {
    return propertyValue.toLowerCase().includes(preferenceValue.toLowerCase())
  }

  return propertyValue === preferenceValue
}
