import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import fs from "fs"
import path from "path"

export async function POST() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "sql", "create-location-preferences-table.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("run_sql", { sql: sqlContent })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json(
        { success: false, message: "Kunde inte skapa tabellen: " + error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, message: "Tabellen har skapats framgångsrikt!" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade: " + (error as Error).message },
      { status: 500 },
    )
  }
}
