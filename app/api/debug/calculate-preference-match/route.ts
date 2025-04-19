import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { calculatePropertyMatchScore } from "@/lib/property-scoring"

export async function POST(request: Request) {
  try {
    const { propertyId, userId } = await request.json()

    if (!propertyId || !userId) {
      return NextResponse.json({ error: "Missing propertyId or userId" }, { status: 400 })
    }

    console.log(`🔍 Debug: Calculating preference match for property ${propertyId} and user ${userId}`)

    // Fetch property data
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("id", propertyId)
      .single()

    if (propertyError || !property) {
      console.error("Error fetching property:", propertyError)
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    // Fetch user preferences
    const { data: preferences, error: prefError } = await supabase
      .from("user_property_requirements")
      .select("feature_id, value, importance")
      .eq("user_id", userId)

    if (prefError) {
      console.error("Error fetching preferences:", prefError)
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
    }

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ error: "No preferences found for user" }, { status: 404 })
    }

    console.log(`✅ Found ${preferences.length} preferences for user`)

    // Fetch feature definitions
    const { data: features, error: featError } = await supabase.from("property_features").select("*")

    if (featError) {
      console.error("Error fetching features:", featError)
      return NextResponse.json({ error: "Failed to fetch feature definitions" }, { status: 500 })
    }

    // Format preferences for match calculation
    const userPreferences = preferences.reduce((acc, pref) => {
      const value =
        pref.value && typeof pref.value === "object" && "value" in pref.value ? pref.value.value : pref.value

      acc[pref.feature_id] = {
        value,
        importance: pref.importance,
      }
      return acc
    }, {})

    console.log("Formatted user preferences:", userPreferences)

    // Create property features object
    const propertyFeatures: Record<string, any> = {
      rooms: Number.parseInt(property.rooms) || 0,
      size: Number.parseInt(property.size) || 0,
    }

    // Add boolean features based on features array
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

    // Check if features exist in the features array
    Object.entries(featureKeywords).forEach(([swedish, english]) => {
      const hasFeature = property.features.some(
        (feature) => feature.toLowerCase().includes(swedish) || feature.toLowerCase().includes(english),
      )
      propertyFeatures[english] = hasFeature
      console.log(`Feature ${english}: ${hasFeature ? "Yes" : "No"}`)
    })

    // Calculate match score
    const matchResult = calculatePropertyMatchScore(propertyFeatures, userPreferences, features)
    console.log(`✅ Preference match calculation complete: ${matchResult.percentage}%`)

    // Update the property analysis with the preference match data
    if (property.is_analyzed) {
      const { data: analysis } = await supabase
        .from("property_analyses")
        .select("id")
        .eq("property_id", propertyId)
        .single()

      if (analysis) {
        console.log(`Updating property analysis ${analysis.id} with preference match data`)
        await supabase
          .from("property_analyses")
          .update({
            preference_match: matchResult,
            updated_at: new Date().toISOString(),
          })
          .eq("id", analysis.id)
      }
    }

    return NextResponse.json({
      propertyFeatures,
      userPreferences,
      matchResult,
    })
  } catch (error) {
    console.error("Error in debug preference match calculation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
