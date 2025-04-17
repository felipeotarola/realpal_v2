import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { sql } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "SQL-fråga krävs" }, { status: 400 })
    }

    // Kör SQL-frågan
    const { data, error } = await supabase.rpc("run_sql", { sql })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      result: data,
    })
  } catch (error) {
    console.error("Error executing SQL:", error)
    return NextResponse.json({ error: "Ett fel uppstod vid körning av SQL" }, { status: 500 })
  }
}
