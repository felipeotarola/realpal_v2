-- Uppdatera saved_properties-tabellen (ta bort analyskolumner om de finns)
ALTER TABLE saved_properties
  DROP COLUMN IF EXISTS analysis_summary,
  DROP COLUMN IF EXISTS total_score,
  DROP COLUMN IF EXISTS attribute_scores,
  DROP COLUMN IF EXISTS pros,
  DROP COLUMN IF EXISTS cons,
  DROP COLUMN IF EXISTS investment_rating,
  DROP COLUMN IF EXISTS value_for_money,
  DROP COLUMN IF EXISTS analyzed_at;

-- Lägg till is_analyzed-flagga i saved_properties
ALTER TABLE saved_properties
  ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN DEFAULT FALSE;

-- Skapa property_analyses-tabellen
CREATE TABLE IF NOT EXISTS property_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES saved_properties(id) ON DELETE CASCADE,
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

-- Skapa index för snabbare sökningar
CREATE INDEX IF NOT EXISTS idx_property_analyses_property_id ON property_analyses(property_id);

-- Skapa en funktion för att uppdatera updated_at automatiskt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Skapa en trigger för att uppdatera updated_at
CREATE TRIGGER update_property_analyses_updated_at
BEFORE UPDATE ON property_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
