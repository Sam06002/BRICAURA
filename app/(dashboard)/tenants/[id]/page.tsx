import Link from 'next/link';
import { getTenantById } from '@/app/actions/tenants';
import { getProperties } from '@/app/actions/properties';
import { getMatchesForTenant } from '@/lib/matching';
import { TenantDetailView } from '@/components/tenant-detail-view';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft } from 'lucide-react';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;

  const [tenant, properties] = await Promise.all([
    getTenantById(id),
    getProperties(),
  ]);

  // Not found or not owned by user (Supabase RLS filters out unowned records)
  if (!tenant) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Tenant Lead Not Found
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The requested tenant lead does not exist, has been deleted, or you do not have permission to view it.
        </p>
        <div className="pt-2">
          <Link href="/tenants">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Tenants
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate up to 5 available property matches with score >= 50
  const matchingProperties = getMatchesForTenant(tenant, properties, 50).slice(0, 5);

  return (
    <TenantDetailView
      initialTenant={tenant}
      matchingProperties={matchingProperties}
    />
  );
}
