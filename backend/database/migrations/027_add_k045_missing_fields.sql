-- Migration: 027_add_k045_missing_fields
-- Description: Add missing columns to jso_k045_document table
-- Date: 2024-07-21
-- Missing columns: returned_at, returned_by, return_reason, completed_at, completed_by

-- Add return fields
ALTER TABLE jso_k045_document
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS returned_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- Add completed fields
ALTER TABLE jso_k045_document
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_by VARCHAR(100);
