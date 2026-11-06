# Supabase Database Setup for BRICAURA

This folder contains the complete SQL schema and configurations for Supabase.

## Files
- `schema.sql`: Full database schema including:
  - Tables: `profiles`, `properties`, `tenants`
  - Row Level Security (RLS) policies for complete user data isolation (`auth.uid() = created_by`)
  - Auto-update `updated_at` triggers
  - Auto-create user profile trigger on `auth.users` signup
  - Supabase Storage bucket `property-photos` with RLS policies

## How to apply

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project.
3. Navigate to **SQL Editor** in the left sidebar.
4. Click **New query**.
5. Paste the entire content of [`schema.sql`](schema.sql).
6. Click **Run**.
7. Confirm in the **Table Editor** that `properties`, `tenants`, and `profiles` are created.
8. Confirm in **Storage** that the `property-photos` bucket is created.

