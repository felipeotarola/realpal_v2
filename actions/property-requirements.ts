"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

export interface PropertyFeature {
  id: string
  label: string
  type: "number" | "boolean" | "select"
  options?: string[]
  min_value?: number
  max_value?: number
}

export interface PropertyRequirement {
  feature_id: string
  value: any
  importance: number
}

// Fetch all property features
export async function getPropertyFeatures(): Promise<PropertyFeature[]> {
  const { data, error } = await supabase.from("property_features").select("*")

  if (error) {
    console.error("Error fetching property features:", error)
    throw new Error("Failed to fetch property features")
  }

  // Transform the data to match our interface
  return data.map((feature) => ({
    id: feature.id,
    label: feature.label,
    type: feature.type as "number" | "boolean" | "select",
    options: feature.options,
    min_value: feature.min_value,
    max_value: feature.max_value,
  }))
}

// Fetch user's property requirements
export async function getUserPropertyRequirements(
  userId: string,
): Promise<Record<string, { value: any; importance: number }>> {
  // Create a Supabase client with the user's session
  const cookieStore = cookies()
  const supabaseClient = createServerComponentClient({ cookies: () => cookieStore })

  const { data, error } = await supabaseClient.from("user_property_requirements").select("*").eq("user_id", userId)

  if (error) {
    console.error("Error fetching user property requirements:", error)
    throw new Error("Failed to fetch user property requirements")
  }

  console.log("Raw user requirements from DB:", data)

  // Transform the data to match our component's state structure
  const requirements: Record<string, { value: any; importance: number }> = {}
  data.forEach((req) => {
    // Extract the actual value from the JSONB structure
    let extractedValue = req.value

    // Handle different value formats
    if (req.value && typeof req.value === "object") {
      // If it's an object with a value property, extract it
      if ("value" in req.value) {
        extractedValue = req.value.value
      }
    }

    requirements[req.feature_id] = {
      value: extractedValue,
      importance: req.importance,
    }
  })

  console.log("Transformed requirements for component:", requirements)

  return requirements
}

// Save user's property requirements
export async function saveUserPropertyRequirements(
  userId: string,
  requirements: Record<string, { value: any; importance: number }>,
): Promise<{ success: boolean; message: string }> {
  try {
    // Create a Supabase client with the user's session
    const cookieStore = cookies()
    const supabaseClient = createServerComponentClient({ cookies: () => cookieStore })

    // Convert requirements object to array of objects for upsert
    const requirementsArray = Object.entries(requirements).map(([feature_id, { value, importance }]) => {
      // Ensure value is properly formatted for JSONB
      let formattedValue = value

      // If value is a primitive type, wrap it in an object for JSONB
      if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
        formattedValue = { value }
      }

      return {
        user_id: userId,
        feature_id,
        value: formattedValue,
        importance,
      }
    })

    console.log("Saving requirements:", requirementsArray)

    // Delete existing requirements first to handle removed items
    const { error: deleteError } = await supabaseClient
      .from("user_property_requirements")
      .delete()
      .eq("user_id", userId)

    if (deleteError) {
      console.error("Error deleting existing requirements:", deleteError)
      return { success: false, message: "Kunde inte ta bort befintliga preferenser: " + deleteError.message }
    }

    // Insert new requirements
    const { error: insertError } = await supabaseClient.from("user_property_requirements").insert(requirementsArray)

    if (insertError) {
      console.error("Error saving property requirements:", insertError)
      return { success: false, message: "Kunde inte spara preferenser: " + insertError.message }
    }

    // Revalidate the preferences page
    revalidatePath("/preferences")
    return { success: true, message: "Preferenser sparade!" }
  } catch (error) {
    console.error("Unexpected error saving preferences:", error)
    return { success: false, message: "Ett oväntat fel inträffade: " + (error as Error).message }
  }
}
