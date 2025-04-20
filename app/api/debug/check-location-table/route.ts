import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check if the table exists
    const { data, error } = await supabase.rpc("run_sql", {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'user_location_preferences'
        );
      `,
    })

    if (error) {
      console.error("Error checking if table exists:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tableExists = data && data[0] && data[0].exists

    if (tableExists) {
      // Get table structure
      const { data: columns, error: columnsError } = await supabase.rpc("run_sql", {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'user_location_preferences';
        `,
      })

      if (columnsError) {
        console.error("Error getting table structure:", columnsError)
      }

      // Get row count
      const { data: count, error: countError } = await supabase.rpc("run_sql", {
        sql: `
          SELECT COUNT(*) FROM user_location_preferences;
        `,
      })

      if (countError) {
        console.error("Error getting row count:", countError)
      }

      return NextResponse.json({
        exists: true,
        columns: columns || [],
        rowCount: count && count[0] ? count[0].count : 0,
      })
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error("Error checking location table:", error)
    return NextResponse.json(
      { error: "Failed to check location table: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
