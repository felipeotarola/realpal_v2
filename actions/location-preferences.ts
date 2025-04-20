"use server"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"

export interface LocationPreference {
  address: string
  latitude: number
  longitude: number
  radius?: number
}

export async function saveLocationPreference(
  userId: string,
  locationPreference: LocationPreference,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Server action: Saving location preference:", { userId, locationPreference })

    // Check if user already has a location preference
    const { data: existingPreference, error: fetchError } = await supabase
      .from("user_location_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine
      console.error("Error fetching existing location preference:", fetchError)
      return { success: false, message: "Kunde inte kontrollera befintliga platsönskemål: " + fetchError.message }
    }

    if (existingPreference) {
      // Update existing preference
      console.log("Updating existing preference:", existingPreference.id)
      const { error: updateError } = await supabase
        .from("user_location_preferences")
        .update({
          address: locationPreference.address,
          latitude: locationPreference.latitude,
          longitude: locationPreference.longitude,
          radius: locationPreference.radius || 5000, // Default 5km radius
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPreference.id)

      if (updateError) {
        console.error("Error updating location preference:", updateError)
        return { success: false, message: "Kunde inte uppdatera platsönskemål: " + updateError.message }
      }
    } else {
      // Insert new preference
      console.log("Inserting new preference")
      const { error: insertError } = await supabase.from("user_location_preferences").insert({
        user_id: userId,
        address: locationPreference.address,
        latitude: locationPreference.latitude,
        longitude: locationPreference.longitude,
        radius: locationPreference.radius || 5000, // Default 5km radius
      })

      if (insertError) {
        console.error("Error inserting location preference:", insertError)
        return { success: false, message: "Kunde inte spara platsönskemål: " + insertError.message }
      }
    }

    // Revalidate the preferences page
    revalidatePath("/preferences")
    return { success: true, message: "Platsönskemål sparade!" }
  } catch (error) {
    console.error("Unexpected error saving location preference:", error)
    return { success: false, message: "Ett oväntat fel inträffade: " + (error as Error).message }
  }
}

// Fetch user's location preference
export async function getUserLocationPreference(userId: string): Promise<LocationPreference | null> {
  try {
    console.log("Fetching location preference for user:", userId)

    const { data, error } = await supabase
      .from("user_location_preferences")
      .select("address, latitude, longitude, radius")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching user location preference:", error)
      return null
    }

    if (!data) {
      console.log("No location preference found for user:", userId)
      return null
    }

    console.log("Found location preference:", data)

    return {
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
    }
  } catch (error) {
    console.error("Error fetching user location preference:", error)
    return null
  }
}
