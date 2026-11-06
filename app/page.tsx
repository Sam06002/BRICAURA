import { Building2, Users, Database, ShieldCheck, Layers, FileCode2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-xl tracking-tight">BRICAURA</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Foundation Ready
            </span>
            <span className="hidden sm:inline">Next.js 15 + Supabase</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Next.js 15 + Supabase Architecture Ready
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            The foundation for properties, tenants, authentication, and database schemas with Row Level Security (RLS) has been set up cleanly.
          </p>
        </div>

        {/* Foundation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Database Schema</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Complete PostgreSQL schema defined in <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">supabase/schema.sql</code> with properties, tenants, profiles, and storage buckets.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>• properties table with type checks</div>
              <div>• tenants table with budget checks</div>
              <div>• property-photos storage bucket</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Row Level Security (RLS)</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Strict isolation policies ensuring authenticated users can only view, create, edit, and delete their own properties and tenants.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>• auth.uid() = created_by</div>
              <div>• Auto updated_at timestamp trigger</div>
              <div>• Auto profile creation on auth.users</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Supabase SSR Clients</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Configured using <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">@supabase/ssr</code> with full Next.js 15 async cookies and middleware support.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>• lib/supabase/client.ts (browser)</div>
              <div>• lib/supabase/server.ts (server async)</div>
              <div>• lib/supabase/middleware.ts (session)</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">TypeScript & Zod Types</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              End-to-end typed contracts for Property, Tenant, User Profile, plus Zod validation schemas for forms and server actions.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>• types/index.ts</div>
              <div>• lib/validations/property.ts</div>
              <div>• lib/validations/tenant.ts</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Components & UI</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              shadcn/ui configured with Tailwind CSS v4, Lucide icons, date-fns, and custom formatting utilities.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>• components/ui/</div>
              <div>• utils/index.ts (currency, dates)</div>
              <div>• components.json</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Next Steps</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Execute <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">supabase/schema.sql</code> in your Supabase SQL editor and add your project credentials to <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">.env.local</code>.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>1. Run SQL schema in Supabase</div>
              <div>2. Set NEXT_PUBLIC_SUPABASE_URL</div>
              <div>3. Build Property & Tenant UI pages</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
