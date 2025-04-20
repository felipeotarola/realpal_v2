import { supabase } from "@/lib/supabase"

export async function getPropertyContext(propertyId: string): Promise<string | null> {
  try {
    // Fetch the property data
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("*")
      .eq("id", propertyId)
      .single()

    if (propertyError || !property) {
      console.error("Error fetching property:", propertyError)
      return null
    }

    // Fetch the property analysis if available
    const { data: analysis, error: analysisError } = await supabase
      .from("property_analyses")
      .select("*")
      .eq("property_id", propertyId)
      .single()

    // Format the property context
    const contextString = JSON.stringify({
      id: property.id,
      title: property.title,
      price: property.price,
      size: property.size,
      rooms: property.rooms,
      location: property.location,
      description: property.description,
      features: property.features,
      url: property.url,
      agent: property.agent,
      year_built: property.year_built,
      monthly_fee: property.monthly_fee,
      energy_rating: property.energy_rating,
      created_at: property.created_at,
      is_analyzed: property.is_analyzed,
      analysis: analysis || null,
    })

    return contextString
  } catch (error) {
    console.error("Error getting property context:", error)
    return null
  }
}
