-- Run this in your Supabase SQL Editor to add the missing columns to your organisation_profiles table

ALTER TABLE public.organisation_profiles 
ADD COLUMN IF NOT EXISTS local_authority TEXT;

ALTER TABLE public.organisation_profiles 
ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

ALTER TABLE public.organisation_profiles 
ADD COLUMN IF NOT EXISTS next_inspection_date DATE;

-- Notify PostgREST to reload the schema cache so the API recognizes the new columns immediately
NOTIFY pgrst, 'reload schema';
