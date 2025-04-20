-- Add location columns to user_property_requirements table
ALTER TABLE user_property_requirements
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS location_longitude NUMERIC;
