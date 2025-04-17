import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data
}
