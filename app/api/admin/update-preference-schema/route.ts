import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile || profile.email !== "admin@example.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Read the SQL file content
    const sqlContent = `
    -- Add preference_match column to property_analyses table if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'property_analyses'
            AND column_name = 'preference_match'
        ) THEN
            ALTER TABLE property_analyses
            ADD COLUMN preference_match JSONB;
            
            RAISE NOTICE 'Added preference_match column to property_analyses table';
        ELSE
            RAISE NOTICE 'preference_match column already exists in property_analyses table';
        END IF;
    END $$;
    `

    // Execute the SQL
    const { error } = await supabase.rpc("execute_sql", { sql_query: sqlContent })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Preference match column added successfully" })
  } catch (error) {
    console.error("Error updating schema:", error)
    return NextResponse.json({ error: "Failed to update schema" }, { status: 500 })
  }
}
