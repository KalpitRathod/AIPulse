    -- ==========================================
    -- AI PULSE V9.0 SCHEMA UPDATE SCRIPT
    -- ==========================================

    -- Add slug column for SEO-friendly URLs
    ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

    -- Backfill existing posts with a generated slug (Title + random 5 chars of ID)
    UPDATE public.articles 
    SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 5) 
    WHERE slug IS NULL;
