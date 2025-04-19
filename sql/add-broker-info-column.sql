-- Add broker_info column to property_analyses table if it doesn't exist
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS broker_info JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN property_analyses.broker_info IS 'JSON data containing broker information and search results';
