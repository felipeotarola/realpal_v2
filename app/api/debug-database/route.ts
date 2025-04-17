import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const propertyId = url.searchParams.get("propertyId")
    const userId = url.searchParams.get("userId")

    // Basic database connection check
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .limit(10)

    if (tablesError) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection error",
          error: tablesError.message,
        },
        { status: 500 },
      )
    }

    // Check saved_properties table structure
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_name", "saved_properties")
      .eq("table_schema", "public")

    if (columnsError) {
      return NextResponse.json(
        {
          status: "error",
          message: "Error fetching table structure",
          error: columnsError.message,
        },
        { status: 500 },
      )
    }

    // Count total properties
    const { count: totalCount, error: countError } = await supabase
      .from("saved_properties")
      .select("*", { count: "exact", head: true })

    // If property ID is provided, check that specific property
    let propertyInfo = null
    if (propertyId) {
      const { data: property, error: propertyError } = await supabase
        .from("saved_properties")
        .select("id, user_id, title, created_at")
        .eq("id", propertyId)
        .maybeSingle()

      if (!propertyError) {
        propertyInfo = property
      }
    }

    // If user ID is provided, count properties for that user
    let userPropertiesCount = null
    if (userId) {
      const { count, error: userCountError } = await supabase
        .from("saved_properties")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      if (!userCountError) {
        userPropertiesCount = count
      }
    }

    return NextResponse.json({
      status: "success",
      databaseConnection: "ok",
      tables: tables.map((t) => t.table_name),
      savedPropertiesColumns: columns,
      totalProperties: totalCount,
      userPropertiesCount,
      propertyInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in debug-database API:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to debug database",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
