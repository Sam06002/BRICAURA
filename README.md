# BRICAURA

> **Next.js 15 & Supabase** Real Estate Property & Tenant Management Platform.

BRICAURA is a full-stack real estate management system built with Next.js 15 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui, and Supabase. It provides complete data isolation through PostgreSQL Row Level Security (RLS), type-safe forms with Zod and React Hook Form, and structured matching between tenants and properties.

---

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React 19, Turbopack)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth, Storage)
- **Supabase SSR:** `@supabase/ssr` with Next.js 15 async cookies & middleware session refresh
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Base UI primitives)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Forms & Validation:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons & Formatting:** [Lucide React](https://lucide.dev/) + [date-fns](https://date-fns.org/)

---

## Project Structure

```text
BRICAURA/
├── app/
│   ├── favicon.ico
│   ├── globals.css             # Tailwind v4 styles and color variables
│   ├── layout.tsx              # Root layout with Geist font & SEO metadata
│   ├── page.tsx                # Architectural overview & foundation dashboard
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Protected route shell
│   │   ├── dashboard/page.tsx  # Overview analytics & KPI metrics
│   │   ├── properties/page.tsx # Property listings & unit inventory
│   │   ├── tenants/page.tsx    # Tenant CRM pipeline stages
│   │   └── matching/page.tsx   # Automated compatibility engine
│   ├── login/page.tsx          # Agent authentication (Sign in & Sign up)
│   ├── actions/                # Server actions (auth, properties, tenants)
│   └── auth/callback/route.ts  # Supabase OAuth/auth code callback
├── components/
│   ├── add-property-dialog.tsx # Property creation modal
│   ├── add-tenant-dialog.tsx   # Tenant registration modal
│   ├── property-list.tsx       # Property search, filter & status manager
│   ├── tenant-list.tsx         # Tenant search & pipeline filter
│   ├── dashboard-nav.tsx       # Sidebar navigation
│   ├── dashboard-header.tsx    # Header & user profile dropdown
│   └── ui/                     # shadcn/ui components (button, card, dialog, input, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Next.js 15 async server client
│   │   └── middleware.ts       # Supabase session refresh handler
│   ├── validations/
│   │   ├── property.ts         # Zod schemas for Property validation
│   │   └── tenant.ts           # Zod schemas for Tenant validation
│   └── utils.ts                # cn() class merging utility
├── middleware.ts               # Next.js edge middleware for auth token refresh
├── public/                     # Static SVG assets & images
├── supabase/
│   ├── README.md               # Supabase execution guide
│   └── schema.sql              # Complete PostgreSQL schema, RLS policies & triggers
├── types/
│   └── index.ts                # TypeScript interfaces (Property, Tenant, UserProfile, Database)
├── utils/
│   └── index.ts                # Helpers for currency (INR), dates, phone, & budget ranges
├── .env.example                # Environment variables template
├── .env.local                  # Local secrets (ignored in git)
├── components.json             # shadcn/ui configuration
└── package.json
```

---

## Database Schema & RLS

All tables and policies are defined in [`supabase/schema.sql`](supabase/schema.sql).

### 1. `properties`
Stores real estate listings with type constraints and storage URLs for photos.

| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`gen_random_uuid()`) |
| `created_at` | `TIMESTAMPTZ` | Auto-set to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Auto-updated via trigger |
| `location` | `TEXT` | Property address/neighborhood |
| `type` | `TEXT` | `1BHK`, `2BHK`, `3BHK`, `4BHK`, `Shop`, `Office`, `Warehouse`, `Other` |
| `rent` | `NUMERIC` | Monthly rent (`>= 0`) |
| `deposit` | `NUMERIC` | Security deposit (`>= 0`) |
| `furnishing` | `TEXT` | `Unfurnished`, `Semi-furnished`, `Fully-furnished` |
| `amenities` | `TEXT[]` | List of amenities (e.g. `['Lift', 'Parking', 'Gym']`) |
| `available_from` | `DATE` | Move-in availability date |
| `is_immediate` | `BOOLEAN` | Ready for immediate occupancy |
| `owner_name` | `TEXT` | Property owner's full name |
| `owner_contact` | `TEXT` | Contact details / phone number |
| `photos` | `TEXT[]` | Supabase storage URLs |
| `status` | `TEXT` | `Available`, `Rented`, `Under Discussion` |
| `notes` | `TEXT` | Optional notes |
| `created_by` | `UUID` | References `auth.users(id)` ON DELETE CASCADE |

### 2. `tenants`
Stores prospective and active tenant leads.

| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`gen_random_uuid()`) |
| `created_at` | `TIMESTAMPTZ` | Auto-set to `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Auto-updated via trigger |
| `name` | `TEXT` | Tenant full name |
| `contact` | `TEXT` | Phone number or email |
| `budget_min` | `NUMERIC` | Minimum budget (`>= 0`) |
| `budget_max` | `NUMERIC` | Maximum budget (`>= budget_min`) |
| `preferred_locations` | `TEXT[]` | Target areas / localities |
| `preferred_type` | `TEXT[]` | Array of desired property types |
| `furnishing_preference`| `TEXT` | `Unfurnished`, `Semi-furnished`, `Fully-furnished`, `Any` |
| `move_in_date` | `DATE` | Expected move-in date |
| `special_requirements` | `TEXT` | Custom requirements (e.g., pet friendly, ground floor) |
| `status` | `TEXT` | `New`, `Site Visit Done`, `Negotiating`, `Closed`, `Lost` |
| `notes` | `TEXT` | Optional notes |
| `created_by` | `UUID` | References `auth.users(id)` ON DELETE CASCADE |

### 3. `profiles`
User metadata automatically created on signup via an `auth.users` trigger.

### 4. Row Level Security (RLS)
Every table has strict RLS policies enabled:
- **Isolation:** Users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `created_by = auth.uid()`.
- **Storage:** Authenticated users can upload, update, and delete images in the `property-photos` bucket under their user ID path (`auth.uid()/*`), while public read access allows serving photo URLs.

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ installed
- A [Supabase](https://supabase.com/) account & project

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/Sam06002/BRICAURA.git
cd BRICAURA
npm install
```

### 3. Configure Supabase Environment Variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your project credentials from your Supabase Dashboard (**Settings -> API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Schema in Supabase
1. Open your Supabase project dashboard.
2. Go to the **SQL Editor**.
3. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it into the editor.
4. Click **Run** to generate the tables, triggers, RLS policies, and the `property-photos` storage bucket.

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

- `npm run dev` — Starts the Next.js development server with Turbopack
- `npm run build` — Compiles the production build
- `npm run start` — Starts the production server
- `npm run lint` — Runs ESLint code quality checks
- `npx tsc --noEmit` — Validates TypeScript types across the codebase

---

## License
Private & Proprietary. Created for real estate asset and lead operations.
