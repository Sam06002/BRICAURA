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

export type UserProfileInsert = Omit<UserProfile, 'created_at' | 'updated_at'>;
export type UserProfileUpdate = Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;

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
  photos: string[]; // Supabase storage URLs
  status: PropertyStatus;
  notes: string | null;
  created_by: string; // references auth.users(id)
}

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'>;
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
  special_requirements: string | null;
  status: TenantStatus;
  notes: string | null;
  created_by: string; // references auth.users(id)
}

export type TenantInsert = Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;
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
      };
      properties: {
        Row: Property;
        Insert: PropertyInsert;
        Update: PropertyUpdate;
      };
      tenants: {
        Row: Tenant;
        Insert: TenantInsert;
        Update: TenantUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      handle_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      property_type: PropertyType;
      furnishing_type: FurnishingType;
      property_status: PropertyStatus;
      tenant_status: TenantStatus;
    };
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

