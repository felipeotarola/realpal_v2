import { supabase } from "@/lib/supabase"

// Denna funktion kan köras en gång för att uppdatera databasen
// Du kan anropa den från en admin-sida eller köra den manuellt
export async function updateDatabase() {
  // Lägg till nya kolumner i saved_properties-tabellen
  const { error } = await supabase.rpc("add_property_analysis_columns")

  if (error) {
    console.error("Error updating database:", error)
    return { success: false, error }
  }

  return { success: true }
}

// SQL som behöver köras i Supabase SQL Editor:
/*
-- Skapa en funktion för att lägga till kolumner (kör detta i SQL Editor)
CREATE OR REPLACE FUNCTION add_property_analysis_columns()
RETURNS void AS $$
BEGIN
  -- Kontrollera om kolumnerna redan finns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'analysis_summary') THEN
    ALTER TABLE saved_properties ADD COLUMN analysis_summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'total_score') THEN
    ALTER TABLE saved_properties ADD COLUMN total_score NUMERIC(3,1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'attribute_scores') THEN
    ALTER TABLE saved_properties ADD COLUMN attribute_scores JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'pros') THEN
    ALTER TABLE saved_properties ADD COLUMN pros TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'cons') THEN
    ALTER TABLE saved_properties ADD COLUMN cons TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'investment_rating') THEN
    ALTER TABLE saved_properties ADD COLUMN investment_rating INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'value_for_money') THEN
    ALTER TABLE saved_properties ADD COLUMN value_for_money INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_properties' AND column_name = 'analyzed_at') THEN
    ALTER TABLE saved_properties ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;
*/
