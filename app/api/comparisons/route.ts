import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// GET endpoint to fetch user's saved comparisons
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Fetch all comparisons for the user
    const { data: comparisons, error } = await supabase
      .from("property_comparisons")
      .select(`
        id, 
        title, 
        description, 
        created_at, 
        updated_at, 
        property_ids, 
        is_shared, 
        share_code, 
        last_viewed_at
      `)
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })

    if (error) {
      console.error("Error fetching comparisons:", error)
      return NextResponse.json({ error: "Failed to fetch comparisons" }, { status: 500 })
    }

    return NextResponse.json({ comparisons })
  } catch (error) {
    console.error("Error in GET /api/comparisons:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

// POST endpoint to create a new comparison
export async function POST(request: Request) {
  try {
    const { userId, title, description, propertyIds, aiAnalysis } = await request.json()

    if (!userId || !title || !propertyIds || !Array.isArray(propertyIds)) {
      return NextResponse.json({ error: "User ID, title, and property IDs array are required" }, { status: 400 })
    }

    // Create the comparison
    const { data: comparison, error } = await supabase
      .from("property_comparisons")
      .insert({
        user_id: userId,
        title,
        description,
        property_ids: propertyIds,
        ai_analysis: aiAnalysis || null,
        last_viewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating comparison:", error)
      return NextResponse.json({ error: "Failed to create comparison" }, { status: 500 })
    }

    // Add properties to the junction table
    for (let i = 0; i < propertyIds.length; i++) {
      const { error: junctionError } = await supabase.from("comparison_properties").insert({
        comparison_id: comparison.id,
        property_id: propertyIds[i],
        display_order: i + 1,
      })

      if (junctionError) {
        console.error("Error adding property to junction table:", junctionError)
        // Continue with other properties even if one fails
      }
    }

    // Create a history record
    await supabase.from("comparison_history").insert({
      comparison_id: comparison.id,
      property_ids: propertyIds,
      ai_analysis: aiAnalysis || null,
      user_id: userId,
    })

    return NextResponse.json({ comparison })
  } catch (error) {
    console.error("Error in POST /api/comparisons:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
