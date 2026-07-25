-- Migration: 026_add_cancelled_fields
-- Description: Add cancelled_at and cancelled_by columns to da_material_documents and k045_documents tables
-- Date: 2024-07-21

-- Add cancelled fields to k045_documents table
ALTER TABLE jso_k045_document
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255);

-- Add cancelled fields to da_material_documents table
ALTER TABLE da_material_documents
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255);
