-- Skapa tabell för jämförelser
CREATE TABLE IF NOT EXISTS property_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_analysis JSONB,
  property_ids UUID[] NOT NULL
);

-- Skapa index för snabbare sökningar
CREATE INDEX IF NOT EXISTS idx_property_comparisons_user_id ON property_comparisons(user_id);

-- Skapa trigger för att uppdatera updated_at
CREATE OR REPLACE FUNCTION update_comparison_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_comparisons_updated_at
BEFORE UPDATE ON property_comparisons
FOR EACH ROW
EXECUTE FUNCTION update_comparison_updated_at();
