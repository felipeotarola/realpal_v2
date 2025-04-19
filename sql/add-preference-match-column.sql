-- Add preference_match column to property_analyses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'property_analyses'
        AND column_name = 'preference_match'
    ) THEN
        ALTER TABLE property_analyses
        ADD COLUMN preference_match JSONB;
        
        RAISE NOTICE 'Added preference_match column to property_analyses table';
    ELSE
        RAISE NOTICE 'preference_match column already exists in property_analyses table';
    END IF;
END $$;
