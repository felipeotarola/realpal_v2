import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// GET endpoint to fetch a specific comparison
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comparisonId } = await params
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!comparisonId) {
      return NextResponse.json({ error: "Comparison ID is required" }, { status: 400 })
    }

    // Update last_viewed_at if userId is provided
    if (userId) {
      await supabase
        .from("property_comparisons")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("id", comparisonId)
        .eq("user_id", userId)
    }

    // Fetch the comparison
    const { data: comparison, error } = await supabase
      .from("property_comparisons")
      .select(`
        id, 
        user_id,
        title, 
        description, 
        created_at, 
        updated_at, 
        property_ids, 
        ai_analysis,
        is_shared, 
        share_code, 
        last_viewed_at
      `)
      .eq("id", comparisonId)
      .single()

    if (error) {
      console.error("Error fetching comparison:", error)
      return NextResponse.json({ error: "Failed to fetch comparison" }, { status: 500 })
    }

    // Check if the user has access to this comparison
    if (userId && comparison.user_id !== userId && !comparison.is_shared) {
      return NextResponse.json({ error: "Unauthorized access to comparison" }, { status: 403 })
    }

    // Fetch the properties in this comparison
    const { data: properties, error: propertiesError } = await supabase
      .from("saved_properties")
      .select(`
        id, 
        title, 
        price, 
        size, 
        rooms, 
        location, 
        description, 
        features, 
        images, 
        url, 
        agent, 
        year_built, 
        monthly_fee, 
        energy_rating, 
        created_at, 
        is_analyzed
      `)
      .in("id", comparison.property_ids)

    if (propertiesError) {
      console.error("Error fetching properties:", propertiesError)
      return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
    }

    // Fetch analyses for properties that have them
    const analyzedPropertyIds = properties.filter((p) => p.is_analyzed).map((p) => p.id)

    let analyses = []
    if (analyzedPropertyIds.length > 0) {
      const { data: analysesData, error: analysesError } = await supabase
        .from("property_analyses")
        .select("*")
        .in("property_id", analyzedPropertyIds)

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError)
      } else {
        analyses = analysesData
      }
    }

    // Attach analyses to properties
    const propertiesWithAnalyses = properties.map((property) => {
      const analysis = analyses.find((a) => a.property_id === property.id)
      return {
        ...property,
        analysis: analysis || null,
      }
    })

    // Fetch notes for this comparison
    const { data: notes, error: notesError } = await supabase
      .from("comparison_notes")
      .select("*")
      .eq("comparison_id", comparisonId)

    if (notesError) {
      console.error("Error fetching notes:", notesError)
    }

    return NextResponse.json({
      comparison,
      properties: propertiesWithAnalyses,
      notes: notes || [],
    })
  } catch (error) {
    console.error("Error in GET /api/comparisons/[id]:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

// PUT endpoint to update a comparison
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comparisonId } = await params
    const { userId, title, description, propertyIds, aiAnalysis, isShared } = await request.json()

    if (!comparisonId || !userId) {
      return NextResponse.json({ error: "Comparison ID and User ID are required" }, { status: 400 })
    }

    // Check if the user owns this comparison
    const { data: existingComparison, error: checkError } = await supabase
      .from("property_comparisons")
      .select("user_id")
      .eq("id", comparisonId)
      .single()

    if (checkError) {
      console.error("Error checking comparison ownership:", checkError)
      return NextResponse.json({ error: "Failed to verify comparison ownership" }, { status: 500 })
    }

    if (existingComparison.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to update this comparison" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      last_viewed_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (propertyIds !== undefined) updateData.property_ids = propertyIds
    if (aiAnalysis !== undefined) updateData.ai_analysis = aiAnalysis
    if (isShared !== undefined) updateData.is_shared = isShared

    // Update the comparison
    const { data: updatedComparison, error } = await supabase
      .from("property_comparisons")
      .update(updateData)
      .eq("id", comparisonId)
      .select()
      .single()

    if (error) {
      console.error("Error updating comparison:", error)
      return NextResponse.json({ error: "Failed to update comparison" }, { status: 500 })
    }

    // If property IDs were updated, update the junction table
    if (propertyIds !== undefined) {
      // First, delete existing entries
      await supabase.from("comparison_properties").delete().eq("comparison_id", comparisonId)

      // Then add new entries
      for (let i = 0; i < propertyIds.length; i++) {
        await supabase.from("comparison_properties").insert({
          comparison_id: comparisonId,
          property_id: propertyIds[i],
          display_order: i + 1,
        })
      }

      // Create a history record
      await supabase.from("comparison_history").insert({
        comparison_id: comparisonId,
        property_ids: propertyIds,
        ai_analysis: aiAnalysis || null,
        user_id: userId,
      })
    }

    return NextResponse.json({ comparison: updatedComparison })
  } catch (error) {
    console.error("Error in PUT /api/comparisons/[id]:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

// DELETE endpoint to delete a comparison
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comparisonId } = await params
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!comparisonId || !userId) {
      return NextResponse.json({ error: "Comparison ID and User ID are required" }, { status: 400 })
    }

    // Check if the user owns this comparison
    const { data: existingComparison, error: checkError } = await supabase
      .from("property_comparisons")
      .select("user_id")
      .eq("id", comparisonId)
      .single()

    if (checkError) {
      console.error("Error checking comparison ownership:", checkError)
      return NextResponse.json({ error: "Failed to verify comparison ownership" }, { status: 500 })
    }

    if (existingComparison.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to delete this comparison" }, { status: 403 })
    }

    // Delete the comparison (cascade will handle related records)
    const { error } = await supabase.from("property_comparisons").delete().eq("id", comparisonId)

    if (error) {
      console.error("Error deleting comparison:", error)
      return NextResponse.json({ error: "Failed to delete comparison" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/comparisons/[id]:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
