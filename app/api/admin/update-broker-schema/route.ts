import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    // SQL to add broker_info column
    const sql = `
      -- Add broker_info column to property_analyses table if it doesn't exist
      ALTER TABLE property_analyses
      ADD COLUMN IF NOT EXISTS broker_info JSONB;
      
      -- Add comment to explain the column
      COMMENT ON COLUMN property_analyses.broker_info IS 'JSON data containing broker information and search results';
    `

    // Execute the SQL
    const { error } = await supabase.rpc("execute_sql", { sql_query: sql })

    if (error) {
      console.error("Error updating schema:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Schema updated successfully" })
  } catch (error) {
    console.error("Error in update-broker-schema route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
