-- ==============================================================================
-- Migration: Add Photo Reference System to Properties Table
-- Description: Replaces heavy storage with lightweight external photo links
-- ==============================================================================

-- 1. Add photo_source_type column with CHECK constraint (safe for existing records)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS photo_source_type TEXT DEFAULT 'None';

-- Ensure constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_photo_source_type_check'
  ) THEN
    ALTER TABLE public.properties
    ADD CONSTRAINT properties_photo_source_type_check
    CHECK (photo_source_type IN ('Facebook', 'WhatsApp', 'Website', 'Google Drive', 'Other', 'None'));
  END IF;
END $$;

-- 2. Add photo_link column
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS photo_link TEXT;

-- 3. Set existing rows with NULL photo_source_type to 'None'
UPDATE public.properties
SET photo_source_type = 'None'
WHERE photo_source_type IS NULL;

-- 4. Set NOT NULL constraint with default for data integrity
ALTER TABLE public.properties
ALTER COLUMN photo_source_type SET NOT NULL,
ALTER COLUMN photo_source_type SET DEFAULT 'None';

