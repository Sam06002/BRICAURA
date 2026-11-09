import { getProperties } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { MatchingView } from '@/components/matching-view';
import { Sparkles } from 'lucide-react';

export default async function MatchingPage() {
  const [properties, tenants] = await Promise.all([
    getProperties(),
    getTenants(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Smart Tenant-Property Matchmaker
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bidirectional matching engine comparing tenant budgets, target localities, unit configurations, and move-in schedules against available inventory.
        </p>
      </div>

      {/* Interactive Bidirectional Matching View */}
      <MatchingView properties={properties} tenants={tenants} />
    </div>
  );
}
