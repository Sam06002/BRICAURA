/**
 * BRICAURA TypeScript Type Definitions
 */

// ==============================================================================
// 1. DOMAIN ENUMS & UNION TYPES
// ==============================================================================

export type PropertyType =
  | '1BHK'
  | '2BHK'
  | '3BHK'
  | '4BHK'
  | 'Shop'
  | 'Office'
  | 'Warehouse'
  | 'Other';

export type FurnishingType =
  | 'Unfurnished'
  | 'Semi-furnished'
  | 'Fully-furnished';

export type FurnishingPreference =
  | FurnishingType
  | 'Any';

export type PropertyStatus =
  | 'Available'
  | 'Rented'
  | 'Under Discussion';

export type TenantStatus =
  | 'New'
  | 'Site Visit Done'
  | 'Negotiating'
  | 'Closed'
  | 'Lost';

export type PhotoSourceType =
  | 'Facebook'
  | 'WhatsApp'
  | 'Website'
  | 'Google Drive'
  | 'Other'
  | 'None';

// ==============================================================================
// 2. USER PROFILE TYPES
// ==============================================================================

export interface UserProfile {
  id: string; // references auth.users(id)
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  agency_name?: string | null;
  role?: string;
}

export type UserProfileInsert = Partial<UserProfile> & { id: string; email: string };
export type UserProfileUpdate = Partial<UserProfile>;

// ==============================================================================
// 3. PROPERTY TYPES
// ==============================================================================

export interface Property {
  id: string;
  created_at: string;
  updated_at: string;
  location: string;
  type: PropertyType;
  rent: number;
  deposit: number;
  furnishing: FurnishingType;
  amenities: string[];
  available_from: string; // ISO date string (YYYY-MM-DD)
  is_immediate: boolean;
  owner_name: string;
  owner_contact: string;
  photos?: string[]; // Optional for backward compatibility
  photo_source_type: PhotoSourceType;
  photo_link: string | null;
  status: PropertyStatus;
  notes: string | null;
  created_by: string; // references auth.users(id)
}

export interface PropertyInsert {
  id?: string;
  created_at?: string;
  updated_at?: string;
  location: string;
  type: PropertyType;
  rent: number;
  deposit: number;
  furnishing: FurnishingType;
  amenities?: string[];
  available_from: string;
  is_immediate?: boolean;
  owner_name: string;
  owner_contact: string;
  photos?: string[];
  photo_source_type?: PhotoSourceType;
  photo_link?: string | null;
  status?: PropertyStatus;
  notes?: string | null;
  created_by: string;
}

export type PropertyUpdate = Partial<PropertyInsert>;

// ==============================================================================
// 4. TENANT TYPES
// ==============================================================================

export interface Tenant {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  contact: string;
  budget_min: number;
  budget_max: number;
  preferred_locations: string[];
  preferred_type: PropertyType[];
  furnishing_preference: FurnishingPreference;
  move_in_date: string; // ISO date string (YYYY-MM-DD)
  next_follow_up: string | null;
  special_requirements: string | null;
  status: TenantStatus;
  notes: string | null;
  created_by: string; // references auth.users(id)
}

export interface TenantInsert {
  id?: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  contact: string;
  budget_min: number;
  budget_max: number;
  preferred_locations?: string[];
  preferred_type?: PropertyType[];
  furnishing_preference: FurnishingPreference;
  move_in_date: string;
  next_follow_up?: string | null;
  special_requirements?: string | null;
  status?: TenantStatus;
  notes?: string | null;
  created_by: string;
}

export type TenantUpdate = Partial<TenantInsert>;

// ==============================================================================
// 5. SUPABASE DATABASE GENERIC SCHEMA TYPE
// ==============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      properties: {
        Row: Property;
        Insert: PropertyInsert;
        Update: PropertyUpdate;
        Relationships: [];
      };
      tenants: {
        Row: Tenant;
        Insert: TenantInsert;
        Update: TenantUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ==============================================================================
// 6. QUERY & FILTER HELPERS
// ==============================================================================

export interface PropertyFilters {
  search?: string;
  type?: PropertyType | 'ALL';
  furnishing?: FurnishingType | 'ALL';
  status?: PropertyStatus | 'ALL';
  minRent?: number;
  maxRent?: number;
  location?: string;
  isImmediate?: boolean;
}

export interface TenantFilters {
  search?: string;
  status?: TenantStatus | 'ALL';
  preferredType?: PropertyType | 'ALL';
  minBudget?: number;
  maxBudget?: number;
  location?: string;
}
