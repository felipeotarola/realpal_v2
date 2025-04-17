import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST() {
  try {
    // Lägg till is_analyzed-flagga i saved_properties
    const { error: alterError } = await supabase.rpc("run_sql", {
      sql: `
        ALTER TABLE saved_properties
        ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN DEFAULT FALSE;
      `,
    })

    if (alterError) {
      console.error("Error adding is_analyzed column:", alterError)
      return NextResponse.json({ error: "Kunde inte lägga till is_analyzed-kolumn" }, { status: 500 })
    }

    // Skapa property_analyses-tabellen
    const { error: createError } = await supabase.rpc("run_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS property_analyses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id UUID NOT NULL,
          analysis_summary TEXT,
          total_score NUMERIC(3,1),
          attribute_scores JSONB,
          pros TEXT[],
          cons TEXT[],
          investment_rating INTEGER,
          value_for_money INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES saved_properties(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_property_analyses_property_id ON property_analyses(property_id);
      `,
    })

    if (createError) {
      console.error("Error creating property_analyses table:", createError)
      return NextResponse.json({ error: "Kunde inte skapa property_analyses-tabellen" }, { status: 500 })
    }

    // Skapa trigger för att uppdatera updated_at
    const { error: triggerError } = await supabase.rpc("run_sql", {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_property_analyses_updated_at ON property_analyses;
        
        CREATE TRIGGER update_property_analyses_updated_at
        BEFORE UPDATE ON property_analyses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `,
    })

    if (triggerError) {
      console.error("Error creating trigger:", triggerError)
      return NextResponse.json({ error: "Kunde inte skapa trigger" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Tabeller och kolumner har skapats framgångsrikt",
    })
  } catch (error) {
    console.error("Error creating tables:", error)
    return NextResponse.json({ error: "Ett fel uppstod vid skapande av tabeller" }, { status: 500 })
  }
}
