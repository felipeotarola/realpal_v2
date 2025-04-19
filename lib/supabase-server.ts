import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        set: (name, value, options) => {
          // This won't be used in read-only server components
          cookieStore.set({ name, value, ...options })
        },
        remove: (name, options) => {
          // This won't be used in read-only server components
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Helper to get user profile using server-side client
export async function getServerUserProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data
}