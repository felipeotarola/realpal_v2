import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// POST endpoint to add a note to a comparison
export async function POST(request: Request) {
  try {
    const { userId, comparisonId, propertyId, noteText } = await request.json()

    if (!userId || !comparisonId || !noteText) {
      return NextResponse.json({ error: "User ID, comparison ID, and note text are required" }, { status: 400 })
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
      return NextResponse.json({ error: "Unauthorized to add notes to this comparison" }, { status: 403 })
    }

    // Create the note
    const { data: note, error } = await supabase
      .from("comparison_notes")
      .insert({
        comparison_id: comparisonId,
        property_id: propertyId || null,
        note_text: noteText,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating note:", error)
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
    }

    // Update the last_viewed_at timestamp on the comparison
    await supabase
      .from("property_comparisons")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", comparisonId)

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Error in POST /api/comparisons/notes:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
