-- Temporarily disable RLS on the user_location_preferences table to allow all operations
ALTER TABLE user_location_preferences DISABLE ROW LEVEL SECURITY;

-- Alternatively, we can create a more permissive policy
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can insert their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can update their own location preferences" ON user_location_preferences;
DROP POLICY IF EXISTS "Users can delete their own location preferences" ON user_location_preferences;

-- Create a single policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON user_location_preferences
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Make sure the service role can bypass RLS
ALTER TABLE user_location_preferences FORCE ROW LEVEL SECURITY;
