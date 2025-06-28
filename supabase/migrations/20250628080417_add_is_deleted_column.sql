ALTER TABLE popups 
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Set all existing popups to not deleted
UPDATE popups SET is_deleted = false WHERE is_deleted IS NULL;