import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { propertyId, userId } = await request.json()

    console.log("Checking if property exists:", { propertyId, userId })

    if (!propertyId || !userId) {
      return NextResponse.json({ error: "Property ID and User ID are required" }, { status: 400 })
    }

    // First check if the property exists at all (regardless of user)
    const { data: anyProperty, error: anyPropertyError } = await supabase
      .from("saved_properties")
      .select("id, user_id")
      .eq("id", propertyId)
      .maybeSingle()

    if (anyPropertyError) {
      console.error("Error checking property existence:", anyPropertyError)
      return NextResponse.json({ error: anyPropertyError.message }, { status: 500 })
    }

    // If property exists but belongs to a different user
    if (anyProperty && anyProperty.user_id !== userId) {
      return NextResponse.json({
        exists: true,
        belongsToUser: false,
        message: "Property exists but belongs to a different user",
        propertyUserId: anyProperty.user_id,
        requestedUserId: userId,
      })
    }

    // Check if property exists for the specific user
    const { data: property, error: propertyError } = await supabase
      .from("saved_properties")
      .select("id")
      .eq("id", propertyId)
      .eq("user_id", userId)
      .maybeSingle()

    if (propertyError) {
      console.error("Error checking property for user:", propertyError)
      return NextResponse.json({ error: propertyError.message }, { status: 500 })
    }

    return NextResponse.json({
      exists: !!property,
      belongsToUser: !!property,
      message: property ? "Property found" : "Property not found for this user",
    })
  } catch (error) {
    console.error("Error in property-exists API:", error)
    return NextResponse.json({ error: "Failed to check property existence" }, { status: 500 })
  }
}
