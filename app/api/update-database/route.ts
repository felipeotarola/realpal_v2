import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Kontrollera om kolumnerna redan finns
    const { data: columns, error: checkError } = await supabase.rpc("get_columns_info", {
      table_name: "saved_properties",
    })

    if (checkError) {
      console.error("Error checking columns:", checkError)
      return NextResponse.json({ error: "Kunde inte kontrollera kolumner" }, { status: 500 })
    }

    const existingColumns = columns.map((col: any) => col.column_name)
    const columnsToAdd = []

    // Kontrollera vilka kolumner som behöver läggas till
    if (!existingColumns.includes("analysis_summary")) columnsToAdd.push("analysis_summary TEXT")
    if (!existingColumns.includes("total_score")) columnsToAdd.push("total_score NUMERIC(3,1)")
    if (!existingColumns.includes("attribute_scores")) columnsToAdd.push("attribute_scores JSONB")
    if (!existingColumns.includes("pros")) columnsToAdd.push("pros TEXT[]")
    if (!existingColumns.includes("cons")) columnsToAdd.push("cons TEXT[]")
    if (!existingColumns.includes("investment_rating")) columnsToAdd.push("investment_rating INTEGER")
    if (!existingColumns.includes("value_for_money")) columnsToAdd.push("value_for_money INTEGER")
    if (!existingColumns.includes("analyzed_at")) columnsToAdd.push("analyzed_at TIMESTAMP WITH TIME ZONE")

    // Om det finns kolumner att lägga till, gör det
    if (columnsToAdd.length > 0) {
      const alterTableQuery = `ALTER TABLE saved_properties ADD COLUMN ${columnsToAdd.join(", ADD COLUMN ")}`
      const { error: alterError } = await supabase.rpc("run_sql", { sql: alterTableQuery })

      if (alterError) {
        console.error("Error adding columns:", alterError)
        return NextResponse.json({ error: "Kunde inte lägga till kolumner" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Lade till ${columnsToAdd.length} kolumner i databasen`,
        addedColumns: columnsToAdd,
      })
    }

    return NextResponse.json({ success: true, message: "Alla kolumner finns redan" })
  } catch (error) {
    console.error("Error updating database:", error)
    return NextResponse.json({ error: "Ett fel uppstod vid uppdatering av databasen" }, { status: 500 })
  }
}
