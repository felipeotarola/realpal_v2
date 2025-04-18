-- Create table for property features if it doesn't exist
CREATE TABLE IF NOT EXISTS property_features (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('number', 'boolean', 'select')),
  options JSONB,
  min_value INTEGER,
  max_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user property requirements if it doesn't exist
CREATE TABLE IF NOT EXISTS user_property_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES property_features(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  importance INTEGER NOT NULL CHECK (importance >= 0 AND importance <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_property_requirements_user_id ON user_property_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_property_requirements_feature_id ON user_property_requirements(feature_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property_features
DROP TRIGGER IF EXISTS update_property_features_updated_at ON property_features;
CREATE TRIGGER update_property_features_updated_at
BEFORE UPDATE ON property_features
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for user_property_requirements
DROP TRIGGER IF EXISTS update_user_property_requirements_updated_at ON user_property_requirements;
CREATE TRIGGER update_user_property_requirements_updated_at
BEFORE UPDATE ON user_property_requirements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default property features
INSERT INTO property_features (id, label, type, options, min_value, max_value)
VALUES
  ('rooms', 'Antal rum', 'number', NULL, 1, 10),
  ('size', 'Storlek (m²)', 'number', NULL, 20, 300),
  ('floor', 'Våning', 'select', '["Bottenvåning", "Mellanvåning", "Högst upp"]', NULL, NULL),
  ('balcony', 'Balkong', 'boolean', NULL, NULL, NULL),
  ('elevator', 'Hiss', 'boolean', NULL, NULL, NULL),
  ('parking', 'Parkering', 'boolean', NULL, NULL, NULL),
  ('garage', 'Garage', 'boolean', NULL, NULL, NULL),
  ('garden', 'Trädgård', 'boolean', NULL, NULL, NULL),
  ('renovated', 'Renoverad', 'boolean', NULL, NULL, NULL),
  ('fireplace', 'Öppen spis', 'boolean', NULL, NULL, NULL),
  ('bathtub', 'Badkar', 'boolean', NULL, NULL, NULL),
  ('dishwasher', 'Diskmaskin', 'boolean', NULL, NULL, NULL),
  ('laundry', 'Tvättmaskin', 'boolean', NULL, NULL, NULL),
  ('storage', 'Förråd', 'boolean', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE
SET 
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  options = EXCLUDED.options,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- Create RLS policies
ALTER TABLE property_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_property_requirements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read property features" ON property_features;
DROP POLICY IF EXISTS "Users can read their own requirements" ON user_property_requirements;
DROP POLICY IF EXISTS "Users can insert their own requirements" ON user_property_requirements;
DROP POLICY IF EXISTS "Users can update their own requirements" ON user_property_requirements;
DROP POLICY IF EXISTS "Users can delete their own requirements" ON user_property_requirements;

-- Everyone can read property_features
CREATE POLICY "Anyone can read property features"
  ON property_features FOR SELECT
  USING (true);

-- Only authenticated users can read their own requirements
CREATE POLICY "Users can read their own requirements"
  ON user_property_requirements FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert their own requirements
CREATE POLICY "Users can insert their own requirements"
  ON user_property_requirements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own requirements
CREATE POLICY "Users can update their own requirements"
  ON user_property_requirements FOR UPDATE
  USING (auth.uid() = user_id);

-- Only authenticated users can delete their own requirements
CREATE POLICY "Users can delete their own requirements"
  ON user_property_requirements FOR DELETE
  USING (auth.uid() = user_id);
