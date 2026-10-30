-- The seed data in V2 gave products placeholder image paths that never resolved to real
-- files (no image storage infrastructure exists yet). Clear them so the field honestly
-- reflects "no image" (empty array) instead of a broken reference.
UPDATE products SET images = '[]'::jsonb;
