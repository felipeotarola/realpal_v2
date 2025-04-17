import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST() {
  try {
    // Hämta alla fastigheter som har analysdata
    const { data: properties, error: fetchError } = await supabase.rpc("run_sql", {
      sql: `
        SELECT id, analysis_summary, total_score, attribute_scores, pros, cons, 
               investment_rating, value_for_money, analyzed_at
        FROM saved_properties
        WHERE analysis_summary IS NOT NULL OR total_score IS NOT NULL
      `,
    })

    if (fetchError) {
      console.error("Error fetching properties with analysis data:", fetchError)
      return NextResponse.json({ error: "Kunde inte hämta fastigheter med analysdata" }, { status: 500 })
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Inga fastigheter med analysdata hittades",
        migratedCount: 0,
      })
    }

    // Migrera data för varje fastighet
    let migratedCount = 0
    let errorCount = 0

    for (const property of properties) {
      // Sätt is_analyzed till true
      const { error: updateError } = await supabase.rpc("run_sql", {
        sql: `
          UPDATE saved_properties
          SET is_analyzed = TRUE
          WHERE id = '${property.id}'
        `,
      })

      if (updateError) {
        console.error(`Error updating is_analyzed for property ${property.id}:`, updateError)
        errorCount++
        continue
      }

      // Skapa en ny analys i property_analyses
      const { error: insertError } = await supabase.rpc("run_sql", {
        sql: `
          INSERT INTO property_analyses (
            property_id, analysis_summary, total_score, attribute_scores, 
            pros, cons, investment_rating, value_for_money, 
            created_at, updated_at
          )
          VALUES (
            '${property.id}',
            ${property.analysis_summary ? `'${property.analysis_summary.replace(/'/g, "''")}'` : "NULL"},
            ${property.total_score || "NULL"},
            ${property.attribute_scores ? `'${JSON.stringify(property.attribute_scores)}'` : "NULL"},
            ${property.pros ? `'${JSON.stringify(property.pros)}'` : "NULL"},
            ${property.cons ? `'${JSON.stringify(property.cons)}'` : "NULL"},
            ${property.investment_rating || "NULL"},
            ${property.value_for_money || "NULL"},
            ${property.analyzed_at ? `'${property.analyzed_at}'` : "NOW()"},
            NOW()
          )
        `,
      })

      if (insertError) {
        console.error(`Error inserting analysis for property ${property.id}:`, insertError)
        errorCount++
        continue
      }

      migratedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Migrerade ${migratedCount} fastigheter med analysdata. ${errorCount} fel uppstod.`,
      migratedCount,
      errorCount,
    })
  } catch (error) {
    console.error("Error migrating data:", error)
    return NextResponse.json({ error: "Ett fel uppstod vid migrering av data" }, { status: 500 })
  }
}
