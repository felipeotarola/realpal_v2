-- Enable Row Level Security on the user_property_requirements table
ALTER TABLE user_property_requirements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own property requirements" ON user_property_requirements;

-- Create a policy that allows users to select, insert, update, and delete their own requirements
CREATE POLICY "Users can manage their own property requirements"
ON user_property_requirements
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS
ALTER TABLE user_property_requirements FORCE ROW LEVEL SECURITY;
