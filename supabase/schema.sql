-- ==============================================================================
-- BRICAURA - Supabase Database Schema & RLS Policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS & DOMAINS / CHECK CONSTRAINTS
-- ==============================================================================

-- Property Types Check: 1BHK, 2BHK, 3BHK, 4BHK, Shop, Office, Warehouse, Other
-- Furnishing Check: Unfurnished, Semi-furnished, Fully-furnished
-- Property Status Check: Available, Rented, Under Discussion
-- Tenant Status Check: New, Site Visit Done, Negotiating, Closed, Lost

-- ==============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. PROFILES TABLE (Linked to auth.users)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  agency_name TEXT,
  role TEXT DEFAULT 'agent'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for auto-creating profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. PROPERTIES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Warehouse', 'Other')),
  rent NUMERIC NOT NULL CHECK (rent >= 0),
  deposit NUMERIC NOT NULL CHECK (deposit >= 0),
  furnishing TEXT NOT NULL CHECK (furnishing IN ('Unfurnished', 'Semi-furnished', 'Fully-furnished')),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  available_from DATE NOT NULL,
  is_immediate BOOLEAN NOT NULL DEFAULT false,
  owner_name TEXT NOT NULL,
  owner_contact TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Rented', 'Under Discussion')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS properties_created_by_idx ON public.properties(created_by);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties(status);
CREATE INDEX IF NOT EXISTS properties_type_idx ON public.properties(type);
CREATE INDEX IF NOT EXISTS properties_location_idx ON public.properties(location);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at DESC);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties RLS Policies (Users can only see and manage their own data)
CREATE POLICY "Users can view their own properties"
  ON public.properties
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own properties"
  ON public.properties
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own properties"
  ON public.properties
  FOR DELETE
  USING (auth.uid() = created_by);

DROP TRIGGER IF EXISTS handle_properties_updated_at ON public.properties;
CREATE TRIGGER handle_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. TENANTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  budget_min NUMERIC NOT NULL CHECK (budget_min >= 0),
  budget_max NUMERIC NOT NULL CHECK (budget_max >= budget_min),
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  preferred_type TEXT[] NOT NULL DEFAULT '{}',
  furnishing_preference TEXT NOT NULL CHECK (furnishing_preference IN ('Unfurnished', 'Semi-furnished', 'Fully-furnished', 'Any')),
  move_in_date DATE NOT NULL,
  special_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Site Visit Done', 'Negotiating', 'Closed', 'Lost')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS tenants_created_by_idx ON public.tenants(created_by);
CREATE INDEX IF NOT EXISTS tenants_status_idx ON public.tenants(status);
CREATE INDEX IF NOT EXISTS tenants_created_at_idx ON public.tenants(created_at DESC);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants RLS Policies (Users can only see and manage their own data)
CREATE POLICY "Users can view their own tenants"
  ON public.tenants
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tenants"
  ON public.tenants
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own tenants"
  ON public.tenants
  FOR DELETE
  USING (auth.uid() = created_by);

DROP TRIGGER IF EXISTS handle_tenants_updated_at ON public.tenants;
CREATE TRIGGER handle_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. STORAGE BUCKET CONFIGURATION (property-photos)
-- ==============================================================================

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload to property-photos bucket under their user id folder
CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can update their property photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete their property photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Property photos are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property-photos');

