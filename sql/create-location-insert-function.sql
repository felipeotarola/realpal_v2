-- Create a function to insert location preferences that bypasses RLS
CREATE OR REPLACE FUNCTION insert_location_preference(
  p_user_id UUID,
  p_address TEXT,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius INTEGER DEFAULT 5000
) RETURNS VOID AS $$
BEGIN
  -- Delete existing preference for this user if it exists
  DELETE FROM user_location_preferences WHERE user_id = p_user_id;
  
  -- Insert new preference
  INSERT INTO user_location_preferences (
    user_id,
    address,
    latitude,
    longitude,
    radius,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_address,
    p_latitude,
    p_longitude,
    p_radius,
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_location_preference TO authenticated;
