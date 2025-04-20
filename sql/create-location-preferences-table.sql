-- Create user_location_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_location_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius INTEGER DEFAULT 5000, -- Default radius in meters (5km)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_user_id ON user_location_preferences(user_id);

-- Create RLS policies
ALTER TABLE user_location_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can insert their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can update their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can delete their own location preferences" ON user_location_preferences;

-- Only authenticated users can read their own location preferences
CREATE POLICY "Users can read their own location preferences"
  ON user_location_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert their own location preferences
CREATE POLICY "Users can insert their own location preferences"
  ON user_location_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own location preferences
CREATE POLICY "Users can update their own location preferences"
  ON user_location_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Only authenticated users can delete their own location preferences
CREATE POLICY "Users can delete their own location preferences"
  ON user_location_preferences FOR DELETE
  USING (auth.uid() = user_id);
